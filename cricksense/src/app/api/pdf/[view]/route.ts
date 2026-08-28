import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import {
  getBattingStats,
  getBowlingStats,
  getDismissalTypeBreakdown,
  getDismissalsByBowlerType,
  getLatestMatch,
  getPerformers,
  getPlayerById,
  getWicketsByPhase,
  isBattingRole,
} from "@/db/queries";
import { getHighlights } from "@/lib/highlights";
import { generateSuggestion } from "@/lib/suggestion";
import PlayerReport from "@/lib/pdf/PlayerReport";
import HomeReport from "@/lib/pdf/HomeReport";

function pdfResponse(buffer: Buffer, filename: string) {
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function generatedOn() {
  return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
}

export async function GET(_req: Request, ctx: RouteContext<"/api/pdf/[view]">) {
  const { view } = await ctx.params;

  if (view === "home") {
    const [match, performers, highlights] = await Promise.all([
      getLatestMatch(),
      getPerformers(),
      getHighlights(),
    ]);
    const performerRows = [
      performers.mostRuns && {
        label: "Most runs",
        name: performers.mostRuns.player.name,
        detail: `${performers.mostRuns.runs.toLocaleString()} runs · ${performers.mostRuns.average} avg`,
      },
      performers.mostWickets && {
        label: "Most wickets",
        name: performers.mostWickets.player.name,
        detail: `${performers.mostWickets.wickets} wkts · ${performers.mostWickets.average} avg`,
      },
      performers.bestStrikeRate && {
        label: "Best strike rate",
        name: performers.bestStrikeRate.player.name,
        detail: `${performers.bestStrikeRate.strikeRate} SR · ${performers.bestStrikeRate.average} avg`,
      },
      performers.needsAttention && {
        label: "Needs attention",
        name: performers.needsAttention.player.name,
        detail: performers.needsAttention.label,
      },
    ].filter((x): x is { label: string; name: string; detail: string } => Boolean(x));

    const buffer = await renderToBuffer(
      HomeReport({
        opponent: match?.opponent ?? "—",
        result: match?.result ?? null,
        venue: match?.venue ?? null,
        performers: performerRows,
        highlights,
        generatedOn: generatedOn(),
      })
    );
    return pdfResponse(buffer, "cricksense-dashboard.pdf");
  }

  const playerMatch = view.match(/^player-(\d+)$/);
  if (playerMatch) {
    const playerId = Number(playerMatch[1]);
    const player = await getPlayerById(playerId);
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    const batting = isBattingRole(player.role);
    const [stats, bars, dismissals, plan] = await Promise.all([
      batting ? getBattingStats(playerId) : getBowlingStats(playerId),
      batting ? getDismissalsByBowlerType(playerId) : getWicketsByPhase(playerId),
      batting ? getDismissalTypeBreakdown(playerId) : Promise.resolve([]),
      generateSuggestion(player),
    ]);

    const statItems = batting
      ? [
          { label: "Runs", value: (stats as Awaited<ReturnType<typeof getBattingStats>>).runs.toLocaleString() },
          { label: "Average", value: String((stats as Awaited<ReturnType<typeof getBattingStats>>).average) },
          { label: "Strike rate", value: String((stats as Awaited<ReturnType<typeof getBattingStats>>).strikeRate) },
          { label: "Innings", value: String(stats.innings) },
        ]
      : [
          { label: "Wickets", value: String((stats as Awaited<ReturnType<typeof getBowlingStats>>).wickets) },
          { label: "Average", value: String((stats as Awaited<ReturnType<typeof getBowlingStats>>).average) },
          { label: "Economy", value: String((stats as Awaited<ReturnType<typeof getBowlingStats>>).economy) },
          { label: "Innings", value: String(stats.innings) },
        ];

    const buffer = await renderToBuffer(
      PlayerReport({
        name: player.name,
        roleLabel: player.roleLabel,
        iccTestRank: player.iccTestRank,
        statItems,
        bars,
        dismissals,
        plan,
        generatedOn: generatedOn(),
      })
    );
    return pdfResponse(buffer, `cricksense-${player.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  }

  return NextResponse.json({ error: "Unknown report view" }, { status: 404 });
}
