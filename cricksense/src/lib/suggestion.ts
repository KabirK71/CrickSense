import Groq from "groq-sdk";
import {
  getDismissalTypeBreakdown,
  getDismissalsByBowlerType,
  getDismissalsByPhase,
  getWicketsByPhase,
  isBattingRole,
  type PlayerRow,
} from "@/db/queries";

const PHASE_LABEL: Record<string, string> = {
  overs_1_10: "overs 1–10",
  overs_11_40: "overs 11–40",
  overs_40_plus: "overs 40+",
};

async function buildFacts(player: PlayerRow) {
  if (isBattingRole(player.role)) {
    const [byBowlerType, byDismissal, byPhase] = await Promise.all([
      getDismissalsByBowlerType(player.id),
      getDismissalTypeBreakdown(player.id),
      getDismissalsByPhase(player.id),
    ]);
    return { kind: "batting" as const, byBowlerType, byDismissal, byPhase };
  }
  const byPhase = await getWicketsByPhase(player.id);
  return { kind: "bowling" as const, byPhase };
}

function ruleBasedPlan(facts: Awaited<ReturnType<typeof buildFacts>>): string[] {
  if (facts.kind === "batting") {
    const topBowlerType = facts.byBowlerType[0];
    const topDismissal = facts.byDismissal[0];
    const topPhase = facts.byPhase[0];
    if (!topBowlerType || !topDismissal) {
      return ["Not enough dismissal data yet to suggest a plan."];
    }
    const bullets: string[] = [
      `Vulnerable to ${topBowlerType.label} bowling — ${topBowlerType.pct}% of dismissals come against it.`,
      `Most often dismissed ${topDismissal.label.toUpperCase()} (${topDismissal.pct}% of dismissals).`,
    ];
    if (topPhase) {
      bullets.push(
        `Weakest in ${PHASE_LABEL[topPhase.label] ?? topPhase.label} — ${topPhase.pct}% of dismissals happen in this window.`
      );
    }
    return bullets;
  }
  if (facts.byPhase.length === 0) return ["Not enough wicket data yet to suggest a plan."];
  return facts.byPhase.slice(0, 3).map((p, i) => {
    const phaseLabel = PHASE_LABEL[p.label] ?? p.label;
    return i === 0
      ? `Most effective in ${phaseLabel} — ${p.pct}% of wickets come in this phase.`
      : `${phaseLabel}: ${p.pct}% of wickets.`;
  });
}

async function groqPlan(player: PlayerRow, facts: Awaited<ReturnType<typeof buildFacts>>): Promise<string[]> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0.4,
    max_tokens: 300,
    reasoning_effort: "low",
    messages: [
      {
        role: "system",
        content:
          "You are a cricket analyst writing a tactical scouting note for how the opposition should bowl to (if batter) " +
          "or how a captain should use (if bowler) the named player, based only on the stats given. " +
          "Reply with ONLY a JSON array of exactly 3 short, terse bullet-point strings (no numbering, no markdown, no preamble). " +
          "Each bullet should be a distinct, specific insight grounded in the stats provided.",
      },
      {
        role: "user",
        content: `Player: ${player.name} (${player.roleLabel}). Stats: ${JSON.stringify(facts)}`,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("empty Groq response");
  return parseBullets(text);
}

/** Models often ignore "reply with JSON" and write markdown-style bullets instead -- handle both. */
function parseBullets(text: string): string[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed) && parsed.every((b) => typeof b === "string") && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    } catch {
      // fall through to line-based parsing
    }
  }
  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s]*[-•*]\s*|^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("malformed Groq bullet response");
  return lines.slice(0, 3);
}

export async function generateSuggestion(player: PlayerRow): Promise<string[]> {
  const facts = await buildFacts(player);
  if (process.env.GROQ_API_KEY) {
    try {
      return await groqPlan(player, facts);
    } catch (err) {
      console.error("Groq suggestion failed, falling back to rule-based:", err);
    }
  }
  return ruleBasedPlan(facts);
}
