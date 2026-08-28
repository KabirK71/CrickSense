import { NextResponse } from "next/server";
import { refreshIccRankings } from "@/lib/icc-rankings";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { updated } = await refreshIccRankings();
    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("ICC rankings refresh failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
