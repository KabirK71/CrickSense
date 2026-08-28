import { NextResponse } from "next/server";
import { getCurrentSquad, initials } from "@/db/queries";

export async function GET() {
  const squad = await getCurrentSquad();
  return NextResponse.json({
    squad: squad.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      roleLabel: p.roleLabel,
      photoUrl: p.photoUrl,
      initials: initials(p.name),
      iccTestRank: p.iccTestRank,
      isCaptain: p.isCaptain,
    })),
  });
}
