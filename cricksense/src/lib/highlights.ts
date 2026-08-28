import {
  getCurrentSquad,
  getDismissalsByBowlerType,
  getWicketsByPhase,
  isBattingRole,
  isBowlingRole,
} from "@/db/queries";

const PHASE_LABEL: Record<string, string> = {
  overs_1_10: "overs 1–10",
  overs_11_40: "overs 11–40",
  overs_40_plus: "overs 40+",
};

export type Highlight = { text: string; tag: string };

/** Rule-based highlight/insight cards, generated from real dismissal and phase splits. */
export async function getHighlights(): Promise<Highlight[]> {
  const squad = await getCurrentSquad();
  const highlights: Highlight[] = [];

  let topDismissalPattern: { name: string; label: string; pct: number } | null = null;
  for (const p of squad) {
    if (!isBattingRole(p.role)) continue;
    const [top] = await getDismissalsByBowlerType(p.id);
    if (top && top.pct >= 40 && (!topDismissalPattern || top.pct > topDismissalPattern.pct)) {
      topDismissalPattern = { name: p.name, label: top.label, pct: top.pct };
    }
  }
  if (topDismissalPattern) {
    highlights.push({
      text: `${topDismissalPattern.name} has been dismissed to ${topDismissalPattern.label} bowling in ${topDismissalPattern.pct}% of dismissals since 2021.`,
      tag: "DISMISSAL PATTERN",
    });
  }

  let topPhaseBowler: { name: string; label: string; pct: number } | null = null;
  for (const p of squad) {
    if (!isBowlingRole(p.role)) continue;
    const [top] = await getWicketsByPhase(p.id);
    if (top && top.pct >= 35 && (!topPhaseBowler || top.pct > topPhaseBowler.pct)) {
      topPhaseBowler = { name: p.name, label: PHASE_LABEL[top.label] ?? top.label, pct: top.pct };
    }
  }
  if (topPhaseBowler) {
    highlights.push({
      text: `${topPhaseBowler.name} takes ${topPhaseBowler.pct}% of his wickets in ${topPhaseBowler.label} — his most productive phase.`,
      tag: "PHASE ANALYSIS",
    });
  }

  const ranked = squad.filter((p) => p.iccTestRank !== null).sort((a, b) => a.iccTestRank! - b.iccTestRank!);
  if (ranked.length > 0) {
    const top = ranked[0];
    highlights.push({
      text: `${top.name} is Pakistan's highest-ranked Test player, #${top.iccTestRank} in the ICC rankings.`,
      tag: "ICC RANKING",
    });
  }

  return highlights;
}
