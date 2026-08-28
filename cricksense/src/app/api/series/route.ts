import { NextResponse } from "next/server";
import { getLatestMatch } from "@/db/queries";

// V1 is post-match analysis only (no live score) -- see requirements PDF
// section 2. This returns the most recently completed Test, not a live one.
export async function GET() {
  const match = await getLatestMatch();
  if (!match) {
    return NextResponse.json({ match: null });
  }
  return NextResponse.json({
    match: {
      opponent: match.opponent,
      venue: match.venue,
      startDate: match.startDate,
      format: match.format,
      result: match.result,
    },
  });
}
