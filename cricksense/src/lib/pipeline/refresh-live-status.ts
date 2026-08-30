// The one daily touchpoint with CricAPI (see src/lib/live-series.ts for why:
// its free tier caps out at 100 requests/day). Runs once at 8:30am Pakistan
// time and does three things in order, each one only if the previous step
// found something:
//   1. Figure out who Pakistan is playing today, or next -- save a snapshot
//      to live_status so the homepage never has to ask CricAPI itself.
//   2. If that match's squad is published, sync players.is_current_squad to
//      match it exactly (see live-squad.ts).
//   3. For any squad player who's missing bio info (photo, DOB, birthplace,
//      batting/bowling style), fetch and save it -- but only players who are
//      actually missing it. Once a player has this data it's never re-fetched.
import { and, isNull, or, eq } from "drizzle-orm";
import { db } from "@/db";
import { players, liveStatus } from "@/db/schema";
import { fetchPakistanFixture } from "@/lib/live-series";
import { syncCurrentSquad } from "./live-squad";
import { getPlayerBio } from "@/lib/player-bio";

export type RefreshLiveStatusResult = {
  fixtureFound: boolean;
  squadSynced: number | null;
  newPlayers: number;
  biosFilled: number;
  biosAttempted: number;
};

export async function refreshLiveStatus(): Promise<RefreshLiveStatusResult> {
  const fixture = await fetchPakistanFixture();

  if (!fixture) {
    return { fixtureFound: false, squadSynced: null, newPlayers: 0, biosFilled: 0, biosAttempted: 0 };
  }

  const [existing] = await db.select({ id: liveStatus.id }).from(liveStatus).limit(1);
  const row = {
    cricapiMatchId: fixture.matchId,
    opponent: fixture.opponent,
    opponentBadgeUrl: fixture.opponentBadgeUrl,
    pakistanBadgeUrl: fixture.pakistanBadgeUrl,
    venue: fixture.venue,
    seriesLabel: fixture.seriesLabel,
    matchDate: fixture.matchDate,
    matchDateTimeGmt: fixture.matchDateTimeGmt,
    isToday: fixture.isToday,
    updatedAt: new Date(),
  };
  if (existing) {
    await db.update(liveStatus).set(row).where(eq(liveStatus.id, existing.id));
  } else {
    await db.insert(liveStatus).values(row);
  }

  let squadSynced: number | null = null;
  let newPlayers = 0;
  if (fixture.hasSquad) {
    const sync = await syncCurrentSquad(fixture.matchId);
    if (sync) {
      squadSynced = sync.squadSize;
      newPlayers = sync.newPlayerIds.length;
    }
  }

  // Only chase bios off a squad list we actually just confirmed today --
  // never off a possibly-stale is_current_squad flag from a prior run.
  const missingBio =
    squadSynced !== null
      ? await db
          .select({ id: players.id, name: players.name })
          .from(players)
          .where(
            and(
              eq(players.isCurrentSquad, true),
              or(isNull(players.dateOfBirth), isNull(players.photoUrl))
            )
          )
      : [];

  let biosFilled = 0;
  for (const p of missingBio) {
    const bio = await getPlayerBio(p.name);
    if (!bio) continue;
    await db
      .update(players)
      .set({
        dateOfBirth: bio.dateOfBirth,
        placeOfBirth: bio.placeOfBirth,
        battingStyle: bio.battingStyle,
        bowlingStyleText: bio.bowlingStyle,
        photoUrl: bio.photoUrl,
        bioUpdatedAt: new Date(),
      })
      .where(eq(players.id, p.id));
    biosFilled += 1;
  }

  return {
    fixtureFound: true,
    squadSynced,
    newPlayers,
    biosFilled,
    biosAttempted: missingBio.length,
  };
}
