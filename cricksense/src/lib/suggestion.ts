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

function ruleBasedPlan(facts: Awaited<ReturnType<typeof buildFacts>>): string {
  if (facts.kind === "batting") {
    const topBowlerType = facts.byBowlerType[0];
    const topDismissal = facts.byDismissal[0];
    const topPhase = facts.byPhase[0];
    if (!topBowlerType || !topDismissal) {
      return "Not enough dismissal data yet to suggest a plan.";
    }
    const phasePart = topPhase ? ` in ${PHASE_LABEL[topPhase.label] ?? topPhase.label}` : "";
    return `Attack with ${topBowlerType.label} early; target ${topDismissal.label.toUpperCase()} dismissals${phasePart}.`;
  }
  const topPhase = facts.byPhase[0];
  if (!topPhase) return "Not enough wicket data yet to suggest a plan.";
  return `Most effective in ${PHASE_LABEL[topPhase.label] ?? topPhase.label} — ${topPhase.pct}% of wickets come in this phase.`;
}

async function groqPlan(player: PlayerRow, facts: Awaited<ReturnType<typeof buildFacts>>): Promise<string> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await client.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0.4,
    max_tokens: 60,
    messages: [
      {
        role: "system",
        content:
          "You are a cricket analyst writing a ONE-SENTENCE tactical plan for how the opposition should bowl to (if batter) " +
          "or how a captain should use (if bowler) the named player, based only on the stats given. " +
          "Be specific and terse, in the style of a scouting note. No preamble, no quotes, one sentence only.",
      },
      {
        role: "user",
        content: `Player: ${player.name} (${player.roleLabel}). Stats: ${JSON.stringify(facts)}`,
      },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("empty Groq response");
  return text.replace(/^["']|["']$/g, "");
}

export async function generateSuggestion(player: PlayerRow): Promise<string> {
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
