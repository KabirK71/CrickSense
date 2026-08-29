// Resolves a CricAPI touring-squad list (see live-series.ts) into the same
// shape SquadGrid expects, so the homepage can show the squad for whichever
// match is actually being played right now instead of the manually-curated
// is_current_squad snapshot (which reflects whatever match this app was last
// built/seeded against, not necessarily the live series).
//
// Players CricAPI knows about that we've never seen in Cricsheet (new
// call-ups/debutants) get a minimal DB row inserted on the fly, using the
// same role-mapping spirit as pipeline/players_meta.py's default fallback --
// their player page will just show "not enough data yet" until Cricsheet
// eventually has their deliveries. Note this can't be matched back to a
// cricsheet_name (CricAPI's naming convention differs from Cricsheet's), so
// if Cricsheet later publishes matches with this player, a second/duplicate
// row could result -- an acceptable, documented edge case for a live-status
// feature, not the primary stats pipeline.
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAllPakistanPlayers, initials } from "@/db/queries";
import type { SquadPlayer } from "@/components/SquadGrid";
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

export async function resolveLiveSquadForGrid(matchId: string): Promise<SquadPlayer[] | null> {
  const liveSquad = await getLiveSquad(matchId);
  if (!liveSquad || liveSquad.length === 0) return null;

  const dbPlayers = await getAllPakistanPlayers();
  const byName = new Map(dbPlayers.map((p) => [p.name.toLowerCase(), p]));
  const byCricsheetName = new Map(
    dbPlayers.filter((p) => p.cricsheetName).map((p) => [p.cricsheetName!.toLowerCase(), p])
  );

  const result: SquadPlayer[] = [];
  for (const entry of liveSquad) {
    const key = entry.name.toLowerCase();
    let dbPlayer = byName.get(key) ?? byCricsheetName.get(key);

    if (!dbPlayer) {
      const { role, roleLabel } = mapRole(entry);
      await db.insert(players).values({ name: entry.name, roleLabel, role, country: "pakistan", isCurrentSquad: true });
      const [inserted] = await db.select().from(players).where(eq(players.name, entry.name)).limit(1);
      dbPlayer = inserted;
    }

    result.push({
      id: dbPlayer.id,
      name: dbPlayer.name,
      roleLabel: dbPlayer.roleLabel,
      initials: initials(dbPlayer.name),
      iccTestRank: dbPlayer.iccTestRank,
    });
  }

  return result;
}
