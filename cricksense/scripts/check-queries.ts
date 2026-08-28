import { db } from "../src/db";
import { players } from "../src/db/schema";
import { eq } from "drizzle-orm";
import {
  getBattingStats,
  getBowlingStats,
  getDismissalTypeBreakdown,
  getDismissalsByBowlerType,
  getWicketsByPhase,
  getPerformers,
  getCurrentSquad,
} from "../src/db/queries";

async function main() {
  const [babar] = await db.select().from(players).where(eq(players.name, "Babar Azam"));
  console.log("Babar batting:", await getBattingStats(babar.id));
  console.log("Babar dismissal types:", await getDismissalTypeBreakdown(babar.id));
  console.log("Babar dismissals by bowler type:", await getDismissalsByBowlerType(babar.id));

  const [shaheen] = await db.select().from(players).where(eq(players.name, "Shaheen Afridi"));
  console.log("Shaheen bowling:", await getBowlingStats(shaheen.id));
  console.log("Shaheen wickets by phase:", await getWicketsByPhase(shaheen.id));

  console.log("Squad size:", (await getCurrentSquad()).length);
  console.log("Performers:", JSON.stringify(await getPerformers(), null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
