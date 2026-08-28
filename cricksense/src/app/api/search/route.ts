import { NextResponse } from "next/server";
import { parseSearchQuery } from "@/lib/search";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query : "";

  const intent = await parseSearchQuery(query);

  if (!intent.understood || !intent.player) {
    return NextResponse.json({
      understood: false,
      player: null,
      filter: null,
      viewType: null,
      options: [],
    });
  }

  const { player, filter, filterLabel } = intent;
  const options = [
    { viewType: "player", title: player.name, sub: "Full player page", playerId: player.id },
    {
      viewType: "filtered",
      title: filter ? `Dismissals vs ${filter}` : "Dismissals breakdown",
      sub: "Filtered breakdown",
      playerId: player.id,
    },
    {
      viewType: "suggestion",
      title: filter ? `Suggested plan vs ${filter}` : "Suggested plan",
      sub: "AI tactical suggestion",
      playerId: player.id,
    },
  ];

  return NextResponse.json({
    understood: true,
    player,
    filter,
    filterLabel,
    viewType: "player",
    options,
  });
}
