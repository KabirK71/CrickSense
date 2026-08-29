// Backfills biographical fields (DOB, birthplace, batting/bowling style,
// photo) from CricAPI into our own players table, instead of fetching live
// on every player-page view. CricAPI's free tier rate-limits hard (observed
// a 15-minute block after a modest burst of requests), so per-view fetching
// meant the bio card randomly disappeared once the day's quota was hit. This
// runs periodically via a Vercel Cron (see the cron route) and reads back
// out of our own DB at render time -- zero live API dependency per page view.
import { desc, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";
import { getPlayerBio } from "@/lib/player-bio";

const STALE_AFTER_DAYS = 30;
// Keep well under CricAPI's free-tier daily cap (2 hits/player: search + info),
// leaving headroom for the live-match card, squad resolution, etc. that also
// share the same daily quota. Runs daily, so the full roster (~200 players)
// gets fully refreshed over about a week even starting from empty.
const BATCH_SIZE = 15;

export async function refreshPlayerBios(): Promise<{ updated: number; attempted: number }> {
  const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);

  // Current squad first (they're what's actually visible on the dashboard) --
  // must be a SQL-level ORDER BY, not a post-fetch sort, otherwise a LIMIT
  // taken before sorting could miss squad members entirely behind a long tail
  // of stale non-squad rows.
  const batch = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .where(or(isNull(players.bioUpdatedAt), lt(players.bioUpdatedAt, staleCutoff)))
    .orderBy(desc(players.isCurrentSquad))
    .limit(BATCH_SIZE);

  let updated = 0;
  for (const p of batch) {
    const bio = await getPlayerBio(p.name);
    if (bio) {
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
      updated += 1;
    } else {
      // No bio found (or CricAPI unavailable) -- still stamp bioUpdatedAt so
      // this player cycles to the back of the queue instead of being retried
      // (and re-costing 2 hits) every single run.
      await db.update(players).set({ bioUpdatedAt: new Date() }).where(eq(players.id, p.id));
    }
  }

  return { updated, attempted: batch.length };
}
