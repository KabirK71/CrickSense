import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import { deliveries, iccRankings, matches, players } from "./schema";

export type PlayerRow = typeof players.$inferSelect;

const BAT_ROLES = ["batsman", "wicketkeeper", "all_rounder"] as const;
const BOWL_ROLES = ["fast_bowler", "spinner", "all_rounder"] as const;

export function isBattingRole(role: string) {
  return (BAT_ROLES as readonly string[]).includes(role);
}
export function isBowlingRole(role: string) {
  return (BOWL_ROLES as readonly string[]).includes(role);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export async function getCurrentSquad() {
  return db
    .select()
    .from(players)
    .where(and(eq(players.country, "pakistan"), eq(players.isCurrentSquad, true)))
    .orderBy(players.id);
}

export async function getAllPakistanPlayers() {
  return db.select().from(players).where(eq(players.country, "pakistan")).orderBy(players.name);
}

export async function getPlayerById(id: number) {
  const rows = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Runs, dismissals, balls faced, average, strike rate -- since 2021. */
export async function getBattingStats(playerId: number) {
  const [row] = await db
    .select({
      runs: sql<number>`coalesce(sum(${deliveries.runs}), 0)`.mapWith(Number),
      ballsFaced: sql<number>`coalesce(count(*) filter (where ${deliveries.isLegalDelivery}), 0)`.mapWith(Number),
      dismissals: sql<number>`coalesce(count(*) filter (where ${deliveries.dismissedPlayerId} = ${playerId}), 0)`.mapWith(Number),
    })
    .from(deliveries)
    .where(eq(deliveries.batsmanId, playerId));

  const inningsCount = await countInnings(playerId, "bat");
  const average = row.dismissals > 0 ? row.runs / row.dismissals : row.runs;
  const strikeRate = row.ballsFaced > 0 ? (row.runs / row.ballsFaced) * 100 : 0;

  return {
    runs: row.runs,
    average: round1(average),
    strikeRate: round1(strikeRate),
    ballsFaced: row.ballsFaced,
    innings: inningsCount,
  };
}

/** Wickets, runs conceded, overs bowled, bowling average, economy -- since 2021. */
export async function getBowlingStats(playerId: number) {
  const [row] = await db
    .select({
      wickets: sql<number>`coalesce(count(*) filter (where ${deliveries.isWicket} and ${deliveries.dismissalType} != 'run_out'), 0)`.mapWith(Number),
      runsConceded: sql<number>`coalesce(sum(${deliveries.bowlerRuns}), 0)`.mapWith(Number),
      legalBalls: sql<number>`coalesce(count(*) filter (where ${deliveries.isLegalDelivery}), 0)`.mapWith(Number),
    })
    .from(deliveries)
    .where(eq(deliveries.bowlerId, playerId));

  const inningsCount = await countInnings(playerId, "bowl");
  const overs = row.legalBalls / 6;
  const average = row.wickets > 0 ? row.runsConceded / row.wickets : row.runsConceded;
  const economy = overs > 0 ? row.runsConceded / overs : 0;

  return {
    wickets: row.wickets,
    average: round1(average),
    economy: round1(economy),
    runsConceded: row.runsConceded,
    ballsBowled: row.legalBalls,
    innings: inningsCount,
  };
}

async function countInnings(playerId: number, kind: "bat" | "bowl") {
  const col = kind === "bat" ? deliveries.batsmanId : deliveries.bowlerId;
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${deliveries.inningsId})`.mapWith(Number) })
    .from(deliveries)
    .where(eq(col, playerId));
  return row.n;
}

/** Dismissal type breakdown (caught/lbw/bowled/...) as % of dismissals, for a batsman. */
export async function getDismissalTypeBreakdown(playerId: number) {
  const rows = await db
    .select({
      type: deliveries.dismissalType,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(deliveries)
    .where(and(eq(deliveries.dismissedPlayerId, playerId), sql`${deliveries.dismissalType} is not null`))
    .groupBy(deliveries.dismissalType);

  return toPercentages(rows.map((r) => ({ label: r.type as string, count: r.count })));
}

/** For a batsman: % of dismissals broken down by the dismissing bowler's type (pace/spin/swing). */
export async function getDismissalsByBowlerType(playerId: number) {
  const rows = await db
    .select({
      bowlerType: deliveries.bowlerType,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(deliveries)
    .where(and(eq(deliveries.dismissedPlayerId, playerId), eq(deliveries.isWicket, true)))
    .groupBy(deliveries.bowlerType);

  return toPercentages(rows.map((r) => ({ label: r.bowlerType as string, count: r.count })));
}

/** For a bowler: % of wickets taken, broken down by innings phase. */
export async function getWicketsByPhase(playerId: number) {
  const rows = await db
    .select({
      phase: deliveries.phase,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(deliveries)
    .where(
      and(
        eq(deliveries.bowlerId, playerId),
        eq(deliveries.isWicket, true),
        sql`${deliveries.dismissalType} != 'run_out'`
      )
    )
    .groupBy(deliveries.phase);

  return toPercentages(rows.map((r) => ({ label: r.phase as string, count: r.count })));
}

/** For a batsman: which wicket-type they take most often taken by, i.e. their weak innings phase. */
export async function getDismissalsByPhase(playerId: number) {
  const rows = await db
    .select({
      phase: deliveries.phase,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(deliveries)
    .where(eq(deliveries.dismissedPlayerId, playerId))
    .groupBy(deliveries.phase);

  return toPercentages(rows.map((r) => ({ label: r.phase as string, count: r.count })));
}

function toPercentages(rows: { label: string; count: number }[]) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return rows
    .map((r) => ({ label: r.label, count: r.count, pct: total > 0 ? Math.round((r.count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export async function getLatestMatch() {
  const rows = await db.select().from(matches).orderBy(desc(matches.startDate)).limit(1);
  return rows[0] ?? null;
}

export async function getIccRank(playerId: number) {
  const rows = await db
    .select()
    .from(iccRankings)
    .where(eq(iccRankings.playerId, playerId))
    .orderBy(desc(iccRankings.updatedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** Top/bottom performer cards for the homepage. */
export async function getPerformers() {
  const squad = await getCurrentSquad();

  let mostRuns: { player: PlayerRow; runs: number; average: number } | null = null;
  let mostWickets: { player: PlayerRow; wickets: number; average: number } | null = null;
  let bestStrikeRate: { player: PlayerRow; strikeRate: number; average: number } | null = null;
  let needsAttention: { player: PlayerRow; pct: number; label: string } | null = null;

  for (const p of squad) {
    if (isBattingRole(p.role)) {
      const bat = await getBattingStats(p.id);
      if (bat.ballsFaced === 0) continue;
      if (!mostRuns || bat.runs > mostRuns.runs) mostRuns = { player: p, runs: bat.runs, average: bat.average };
      if (!bestStrikeRate || bat.strikeRate > bestStrikeRate.strikeRate)
        bestStrikeRate = { player: p, strikeRate: bat.strikeRate, average: bat.average };

      const byBowlerType = await getDismissalsByBowlerType(p.id);
      const top = byBowlerType[0];
      if (top && top.pct >= 40 && (!needsAttention || top.pct > needsAttention.pct)) {
        needsAttention = { player: p, pct: top.pct, label: `${top.pct}% dismissals to ${top.label}` };
      }
    }
    if (isBowlingRole(p.role)) {
      const bowl = await getBowlingStats(p.id);
      if (bowl.ballsBowled === 0) continue;
      if (!mostWickets || bowl.wickets > mostWickets.wickets)
        mostWickets = { player: p, wickets: bowl.wickets, average: bowl.average };
    }
  }

  return { mostRuns, mostWickets, bestStrikeRate, needsAttention };
}
