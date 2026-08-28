import { NextResponse } from "next/server";
import { getPlayerById } from "@/db/queries";
import { generateSuggestion } from "@/lib/suggestion";

export async function GET(_req: Request, ctx: RouteContext<"/api/suggestion/[playerId]">) {
  const { playerId } = await ctx.params;
  const id = Number(playerId);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Invalid player id" }, { status: 400 });
  }

  const player = await getPlayerById(id);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const plan = await generateSuggestion(player);
  return NextResponse.json({ playerId: id, plan });
}
