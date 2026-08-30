// Syncs CricAPI's touring-squad list (see live-series.ts) into our own
// players table, called once a day by refresh-live-status.ts -- NOT on page
// render. The homepage always reads the squad straight from
// players.is_current_squad, so this function's whole job is keeping that flag
// an accurate reflection of whoever CricAPI says is actually touring right
// now: newly-called-up players get inserted, players CricAPI still lists stay
// flagged true, and players who've dropped out of the touring squad get
// flagged false.
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAllPakistanPlayers } from "@/db/queries";
import { getLiveSquad, type LiveSquadEntry } from "@/lib/live-series";
import type { PlayerRole } from "./players-meta";

function mapRole(entry: LiveSquadEntry): { role: PlayerRole; roleLabel: string } {
  const r = (entry.role ?? "").toLowerCase();
  if (r.includes("wk")) return { role: "wicketkeeper", roleLabel: "Wicketkeeper" };
  if (r.includes("allrounder")) return { role: "all_rounder", roleLabel: "All-rounder" };
  if (r.includes("bowler")) {
    const bs = (entry.bowlingStyle ?? "").toLowerCase();
    const isSpin = /spin|break|orthodox|chinaman/.test(bs);
    return isSpin ? { role: "spinner", roleLabel: "Spinner" } : { role: "fast_bowler", roleLabel: "Fast bowler" };
  }
  return { role: "batsman", roleLabel: "Batsman" };
}

export type SquadSyncResult = { squadSize: number; newPlayerIds: number[] };

/** Returns null (and touches nothing) if CricAPI has no squad for this match yet. */
export async function syncCurrentSquad(matchId: string): Promise<SquadSyncResult | null> {
  const liveSquad = await getLiveSquad(matchId);
  if (!liveSquad || liveSquad.length === 0) return null;

  const dbPlayers = await getAllPakistanPlayers();
  const byName = new Map(dbPlayers.map((p) => [p.name.toLowerCase(), p]));
  const byCricsheetName = new Map(
    dbPlayers.filter((p) => p.cricsheetName).map((p) => [p.cricsheetName!.toLowerCase(), p])
  );

  const matchedIds: number[] = [];
  const newPlayerIds: number[] = [];

  for (const entry of liveSquad) {
    const key = entry.name.toLowerCase();
    let dbPlayer = byName.get(key) ?? byCricsheetName.get(key);

    if (!dbPlayer) {
      const { role, roleLabel } = mapRole(entry);
      await db
        .insert(players)
        .values({ name: entry.name, roleLabel, role, country: "pakistan", isCurrentSquad: true });
      const [inserted] = await db.select().from(players).where(eq(players.name, entry.name)).limit(1);
      dbPlayer = inserted;
      newPlayerIds.push(inserted.id);
    }

    matchedIds.push(dbPlayer.id);
  }

  await db.update(players).set({ isCurrentSquad: true }).where(inArray(players.id, matchedIds));

  const droppedIds = dbPlayers.filter((p) => p.isCurrentSquad && !matchedIds.includes(p.id)).map((p) => p.id);
  if (droppedIds.length > 0) {
    await db.update(players).set({ isCurrentSquad: false }).where(inArray(players.id, droppedIds));
  }

  return { squadSize: matchedIds.length, newPlayerIds };
}
