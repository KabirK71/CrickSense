import { NextResponse } from "next/server";
import { getHighlights } from "@/lib/highlights";

export async function GET() {
  const highlights = await getHighlights();
  return NextResponse.json({ highlights });
}
