import { NextResponse } from "next/server";
import {
  getBattingStats,
  getBowlingStats,
  getDismissalTypeBreakdown,
  getDismissalsByBowlerType,
  getPlayerById,
  getWicketsByPhase,
  initials,
  isBattingRole,
} from "@/db/queries";

export async function GET(_req: Request, ctx: RouteContext<"/api/player/[id]">) {
  const { id } = await ctx.params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const player = await getPlayerById(playerId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const batting = isBattingRole(player.role);

  const [stats, bars, dismissals] = await Promise.all([
    batting ? getBattingStats(playerId) : getBowlingStats(playerId),
    batting ? getDismissalsByBowlerType(playerId) : getWicketsByPhase(playerId),
    batting ? getDismissalTypeBreakdown(playerId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    player: {
      id: player.id,
      name: player.name,
      role: player.role,
      roleLabel: player.roleLabel,
      photoUrl: player.photoUrl,
      initials: initials(player.name),
      iccTestRank: player.iccTestRank,
      isCaptain: player.isCaptain,
      isBatting: batting,
    },
    stats,
    bars,
    dismissals,
  });
}
