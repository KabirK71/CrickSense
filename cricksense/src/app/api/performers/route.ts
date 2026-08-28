import { NextResponse } from "next/server";
import { getPerformers } from "@/db/queries";

export async function GET() {
  const { mostRuns, mostWickets, bestStrikeRate, needsAttention } = await getPerformers();
  return NextResponse.json({
    mostRuns: mostRuns && {
      playerId: mostRuns.player.id,
      name: mostRuns.player.name,
      runs: mostRuns.runs,
      average: mostRuns.average,
    },
    mostWickets: mostWickets && {
      playerId: mostWickets.player.id,
      name: mostWickets.player.name,
      wickets: mostWickets.wickets,
      average: mostWickets.average,
    },
    bestStrikeRate: bestStrikeRate && {
      playerId: bestStrikeRate.player.id,
      name: bestStrikeRate.player.name,
      strikeRate: bestStrikeRate.strikeRate,
      average: bestStrikeRate.average,
    },
    needsAttention: needsAttention && {
      playerId: needsAttention.player.id,
      name: needsAttention.player.name,
      label: needsAttention.label,
    },
  });
}
