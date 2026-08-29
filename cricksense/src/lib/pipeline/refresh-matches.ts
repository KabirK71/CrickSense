// TypeScript port of pipeline/download_cricsheet.py + parse_matches.py +
// load_to_neon.py, adapted to run inside a Vercel Cron -> API route (same
// pattern as src/lib/icc-rankings.ts) instead of a local one-off script.
//
// Unlike the Python pipeline (which truncates and reloads every match on
// every run -- fine for a one-off local backfill, too slow/wasteful for a
// function that runs daily), this only inserts matches that aren't already
// in the database. Existing matches/deliveries are left untouched.
import { unzipSync } from "fflate";
import { db } from "@/db";
import { players, matches, innings, deliveries } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getBowlerType } from "./bowler-types";
import { getPlayerMeta } from "./players-meta";

const ZIP_URL = "https://cricsheet.org/downloads/pakistan_male_json.zip";
const MIN_DATE = "2021-01-01";

type CricsheetDelivery = {
  batter: string;
  bowler: string;
  actual_delivery?: string;
  runs: { batter: number; extras: number; total: number };
  extras?: { wides?: number; noballs?: number; byes?: number; legbyes?: number };
  wickets?: { kind: string; player_out: string }[];
};

type CricsheetMatch = {
  info: {
    match_type: string;
    dates: string[];
    teams: string[];
    venue?: string;
    outcome?: { result?: string; winner?: string; by?: { wickets?: number; runs?: number; innings?: number } };
    players: Record<string, string[]>;
  };
  innings: { team: string; overs: { over: number; deliveries: CricsheetDelivery[] }[] }[];
};

const DISMISSAL_MAP: Record<string, "caught" | "bowled" | "lbw" | "run_out" | "stumped"> = {
  caught: "caught",
  "caught and bowled": "caught",
  bowled: "bowled",
  lbw: "lbw",
  "run out": "run_out",
  stumped: "stumped",
};

function phaseForOver(over: number): "overs_1_10" | "overs_11_40" | "overs_40_plus" {
  if (over < 10) return "overs_1_10";
  if (over < 40) return "overs_11_40";
  return "overs_40_plus";
}

function ballNumber(actualDelivery: string | undefined, fallback: number): number {
  const frac = actualDelivery?.split(".")[1];
  const n = frac ? Number(frac) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function formatOutcome(outcome: CricsheetMatch["info"]["outcome"]): string {
  if (!outcome) return "Result unknown";
  if (outcome.result === "draw") return "Match drawn";
  if (outcome.result === "tie") return "Match tied";
  const winner = outcome.winner;
  if (!winner) return "Result unknown";
  const by = outcome.by ?? {};
  if (by.wickets !== undefined) return `${winner} won by ${by.wickets} wickets`;
  if (by.runs !== undefined) return `${winner} won by ${by.runs} runs`;
  if (by.innings !== undefined) {
    const extra = by.runs !== undefined ? ` and ${by.runs} runs` : "";
    return `${winner} won by an innings${extra}`;
  }
  return `${winner} won`;
}

type ParsedDelivery = {
  over: number;
  ball: number;
  batsman: string;
  bowler: string;
  bowlerType: "pace" | "spin" | "swing";
  runs: number;
  extras: number;
  bowlerRuns: number;
  isLegalDelivery: boolean;
  isWicket: boolean;
  dismissalType: "caught" | "bowled" | "lbw" | "run_out" | "stumped" | "other" | null;
  dismissedPlayer: string | null;
  phase: "overs_1_10" | "overs_11_40" | "overs_40_plus";
};

type ParsedMatch = {
  cricsheetId: string;
  opponent: string;
  venue: string | null;
  startDate: string;
  result: string;
  innings: { team: string; inningsNumber: number; deliveries: ParsedDelivery[] }[];
};

function parseMatch(data: CricsheetMatch, cricsheetId: string): ParsedMatch | null {
  const info = data.info;
  if (info.match_type !== "Test") return null;
  const dates = info.dates ?? [];
  if (dates.length === 0 || dates[0] < MIN_DATE) return null;
  if (!info.teams.includes("Pakistan")) return null;
  const opponent = info.teams.find((t) => t !== "Pakistan") ?? "Unknown";

  const inningsOut = data.innings.map((inn, idx) => {
    const deliveriesOut: ParsedDelivery[] = [];
    for (const overBlock of inn.overs) {
      const phase = phaseForOver(overBlock.over);
      overBlock.deliveries.forEach((ball, i) => {
        const wicket = ball.wickets?.[0] ?? null;
        const dismissalType = wicket ? (DISMISSAL_MAP[wicket.kind] ?? "other") : null;
        const dismissedPlayer = wicket?.player_out ?? null;
        const extrasDetail = ball.extras ?? {};
        const isLegal = extrasDetail.wides === undefined && extrasDetail.noballs === undefined;
        const bowlerRuns = ball.runs.batter + (extrasDetail.wides ?? 0) + (extrasDetail.noballs ?? 0);
        deliveriesOut.push({
          over: overBlock.over,
          ball: ballNumber(ball.actual_delivery, i + 1),
          batsman: ball.batter,
          bowler: ball.bowler,
          bowlerType: getBowlerType(ball.bowler),
          runs: ball.runs.batter,
          extras: ball.runs.extras,
          bowlerRuns,
          isLegalDelivery: isLegal,
          isWicket: Boolean(ball.wickets?.length),
          dismissalType,
          dismissedPlayer,
          phase,
        });
      });
    }
    return { team: inn.team, inningsNumber: idx + 1, deliveries: deliveriesOut };
  });

  return {
    cricsheetId,
    opponent,
    venue: info.venue ?? null,
    startDate: dates[0],
    result: formatOutcome(info.outcome),
    innings: inningsOut,
  };
}

export type RefreshMatchesResult = {
  matchesSeen: number;
  newMatches: number;
  newDeliveries: number;
  newMatchSummaries: { opponent: string; startDate: string; result: string }[];
};

export async function refreshMatchData(): Promise<RefreshMatchesResult> {
  const res = await fetch(ZIP_URL);
  if (!res.ok) throw new Error(`Cricsheet download failed: ${res.status}`);
  const zipBytes = new Uint8Array(await res.arrayBuffer());
  const files = unzipSync(zipBytes, { filter: (f) => f.name.endsWith(".json") });

  const decoder = new TextDecoder();
  const parsedMatches: ParsedMatch[] = [];
  const playerCountry = new Map<string, string>();

  for (const [name, bytes] of Object.entries(files)) {
    let data: CricsheetMatch;
    try {
      data = JSON.parse(decoder.decode(bytes));
    } catch {
      continue;
    }
    const cricsheetId = name.replace(/\.json$/, "");
    const parsed = parseMatch(data, cricsheetId);
    if (parsed) parsedMatches.push(parsed);

    for (const [team, names] of Object.entries(data.info.players ?? {})) {
      for (const name of names) {
        if (!playerCountry.has(name)) playerCountry.set(name, team);
      }
    }
  }

  const existingIds = new Set(
    (await db.select({ cricsheetId: matches.cricsheetId }).from(matches)).map((m) => m.cricsheetId)
  );
  const toInsert = parsedMatches.filter((m) => !existingIds.has(m.cricsheetId));

  if (toInsert.length === 0) {
    return { matchesSeen: parsedMatches.length, newMatches: 0, newDeliveries: 0, newMatchSummaries: [] };
  }

  // Upsert every player who appears in a newly-seen match (existing players
  // are untouched if their cricsheet_name already exists -- ON CONFLICT only
  // updates rows that are actually re-submitted here).
  const namesInNewMatches = new Set<string>();
  for (const m of toInsert) {
    for (const inn of m.innings) {
      for (const d of inn.deliveries) {
        namesInNewMatches.add(d.batsman);
        namesInNewMatches.add(d.bowler);
        if (d.dismissedPlayer) namesInNewMatches.add(d.dismissedPlayer);
      }
    }
  }

  const playerRows = Array.from(namesInNewMatches).map((name) => {
    const team = playerCountry.get(name) ?? "Unknown";
    if (team === "Pakistan") {
      const meta = getPlayerMeta(name);
      return {
        name: meta.displayName,
        roleLabel: meta.roleLabel,
        role: meta.role,
        country: "pakistan",
        cricsheetName: name,
        isCurrentSquad: meta.isCurrentSquad,
        isCaptain: meta.isCaptain,
      };
    }
    return {
      name,
      roleLabel: "Player",
      role: "batsman" as const,
      country: team.toLowerCase().replace(/\s+/g, "_"),
      cricsheetName: name,
      isCurrentSquad: false,
      isCaptain: false,
    };
  });

  if (playerRows.length > 0) {
    for (const row of playerRows) {
      await db
        .insert(players)
        .values(row)
        .onConflictDoUpdate({
          target: players.cricsheetName,
          set: {
            name: row.name,
            roleLabel: row.roleLabel,
            role: row.role,
            country: row.country,
            isCurrentSquad: row.isCurrentSquad,
            isCaptain: row.isCaptain,
          },
        });
    }
  }

  const idRows = await db
    .select({ id: players.id, cricsheetName: players.cricsheetName })
    .from(players)
    .where(inArray(players.cricsheetName, Array.from(namesInNewMatches)));
  const playerIds = new Map(idRows.map((r) => [r.cricsheetName as string, r.id]));

  let newDeliveries = 0;
  for (const m of toInsert) {
    await db.insert(matches).values({
      cricsheetId: m.cricsheetId,
      opponent: m.opponent,
      venue: m.venue,
      startDate: m.startDate,
      format: "test",
      result: m.result,
    });
    const [matchRow] = await db
      .select({ id: matches.id })
      .from(matches)
      .where(eq(matches.cricsheetId, m.cricsheetId));

    for (const inn of m.innings) {
      await db.insert(innings).values({ matchId: matchRow.id, team: inn.team, inningsNumber: inn.inningsNumber });
      const [inningsRow] = await db
        .select({ id: innings.id })
        .from(innings)
        .where(and(eq(innings.matchId, matchRow.id), eq(innings.inningsNumber, inn.inningsNumber)));

      if (inn.deliveries.length === 0) continue;
      await db.insert(deliveries).values(
        inn.deliveries.map((d) => ({
          inningsId: inningsRow.id,
          over: d.over,
          ball: d.ball,
          batsmanId: playerIds.get(d.batsman) ?? null,
          bowlerId: playerIds.get(d.bowler) ?? null,
          bowlerType: d.bowlerType,
          runs: d.runs,
          extras: d.extras,
          bowlerRuns: d.bowlerRuns,
          isLegalDelivery: d.isLegalDelivery,
          isWicket: d.isWicket,
          dismissalType: d.dismissalType,
          dismissedPlayerId: d.dismissedPlayer ? (playerIds.get(d.dismissedPlayer) ?? null) : null,
          phase: d.phase,
        }))
      );
      newDeliveries += inn.deliveries.length;
    }
  }

  return {
    matchesSeen: parsedMatches.length,
    newMatches: toInsert.length,
    newDeliveries,
    newMatchSummaries: toInsert.map((m) => ({ opponent: m.opponent, startDate: m.startDate, result: m.result })),
  };
}
