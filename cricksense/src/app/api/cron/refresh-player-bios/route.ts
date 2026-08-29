import { NextResponse } from "next/server";
import { refreshPlayerBios } from "@/lib/pipeline/refresh-player-bios";

export const maxDuration = 60;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshPlayerBios();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("Player bio refresh failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
