import Groq from "groq-sdk";
import {
  getDismissalTypeBreakdown,
  getDismissalsByBowlerType,
  getDismissalsByPhase,
  getWicketsByPhase,
  isBattingRole,
  type BowlerType,
  type DismissalType,
  type PlayerRow,
} from "@/db/queries";

const PHASE_LABEL: Record<string, string> = {
  overs_1_10: "overs 1–10",
  overs_11_40: "overs 11–40",
  overs_40_plus: "overs 40+",
};

const BOWLER_TYPE_FILTERS = new Set<string>(["pace", "spin", "swing"]);
const DISMISSAL_TYPE_FILTERS = new Set<string>(["lbw", "caught", "bowled"]);

function isBowlerTypeFilter(f?: string | null): f is BowlerType {
  return !!f && BOWLER_TYPE_FILTERS.has(f);
}
function isDismissalTypeFilter(f?: string | null): f is DismissalType {
  return !!f && DISMISSAL_TYPE_FILTERS.has(f);
}

async function buildFacts(player: PlayerRow, filter?: string | null) {
  if (isBattingRole(player.role)) {
    if (isBowlerTypeFilter(filter)) {
      const [overall, byDismissal, byPhase] = await Promise.all([
        getDismissalsByBowlerType(player.id),
        getDismissalTypeBreakdown(player.id, { bowlerType: filter }),
        getDismissalsByPhase(player.id, { bowlerType: filter }),
      ]);
      const overallPct = overall.find((r) => r.label === filter)?.pct ?? 0;
      return { kind: "batting-bowler-type" as const, filter, overallPct, byDismissal, byPhase };
    }
    if (isDismissalTypeFilter(filter)) {
      const [overall, byBowlerType, byPhase] = await Promise.all([
        getDismissalTypeBreakdown(player.id),
        getDismissalsByBowlerType(player.id, { dismissalType: filter }),
        getDismissalsByPhase(player.id, { dismissalType: filter }),
      ]);
      const overallPct = overall.find((r) => r.label === filter)?.pct ?? 0;
      return { kind: "batting-dismissal-type" as const, filter, overallPct, byBowlerType, byPhase };
    }
    const [byBowlerType, byDismissal, byPhase] = await Promise.all([
      getDismissalsByBowlerType(player.id),
      getDismissalTypeBreakdown(player.id),
      getDismissalsByPhase(player.id),
    ]);
    return { kind: "batting" as const, byBowlerType, byDismissal, byPhase };
  }

  // Bowler-type filters don't apply to a bowler's own figures (they only bowl
  // one type) -- fall back to the unfiltered plan in that case.
  if (isDismissalTypeFilter(filter)) {
    const byPhase = await getWicketsByPhase(player.id, { dismissalType: filter });
    return { kind: "bowling-dismissal-type" as const, filter, byPhase };
  }
  const byPhase = await getWicketsByPhase(player.id);
  return { kind: "bowling" as const, byPhase };
}

function ruleBasedPlan(facts: Awaited<ReturnType<typeof buildFacts>>): string[] {
  switch (facts.kind) {
    case "batting-bowler-type": {
      if (facts.overallPct === 0) return [`No recorded dismissals to ${facts.filter} bowling yet.`];
      const bullets: string[] = [`${facts.overallPct}% of his dismissals come against ${facts.filter} bowling.`];
      const topDismissal = facts.byDismissal[0];
      if (topDismissal) {
        bullets.push(
          `Against ${facts.filter}, most often dismissed ${topDismissal.label.toUpperCase()} (${topDismissal.pct}% of those dismissals).`
        );
      }
      const topPhase = facts.byPhase[0];
      if (topPhase) {
        bullets.push(
          `Most vulnerable to ${facts.filter} in ${PHASE_LABEL[topPhase.label] ?? topPhase.label} (${topPhase.pct}% of those dismissals).`
        );
      }
      return bullets;
    }
    case "batting-dismissal-type": {
      if (facts.overallPct === 0) return [`No recorded ${facts.filter.toUpperCase()} dismissals yet.`];
      const bullets: string[] = [`${facts.overallPct}% of his dismissals are ${facts.filter.toUpperCase()}.`];
      const topBowlerType = facts.byBowlerType[0];
      if (topBowlerType) {
        bullets.push(
          `Most ${facts.filter.toUpperCase()} dismissals come against ${topBowlerType.label} bowling (${topBowlerType.pct}% of those dismissals).`
        );
      }
      const topPhase = facts.byPhase[0];
      if (topPhase) {
        bullets.push(
          `Most ${facts.filter.toUpperCase()} dismissals happen in ${PHASE_LABEL[topPhase.label] ?? topPhase.label} (${topPhase.pct}%).`
        );
      }
      return bullets;
    }
    case "bowling-dismissal-type": {
      if (facts.byPhase.length === 0) return [`No recorded ${facts.filter.toUpperCase()} wickets yet.`];
      return facts.byPhase.slice(0, 3).map((p, i) => {
        const phaseLabel = PHASE_LABEL[p.label] ?? p.label;
        return i === 0
          ? `Most ${facts.filter.toUpperCase()} wickets come in ${phaseLabel} (${p.pct}%).`
          : `${phaseLabel}: ${p.pct}% of ${facts.filter.toUpperCase()} wickets.`;
      });
    }
    case "batting": {
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
    case "bowling": {
      if (facts.byPhase.length === 0) return ["Not enough wicket data yet to suggest a plan."];
      return facts.byPhase.slice(0, 3).map((p, i) => {
        const phaseLabel = PHASE_LABEL[p.label] ?? p.label;
        return i === 0
          ? `Most effective in ${phaseLabel} — ${p.pct}% of wickets come in this phase.`
          : `${phaseLabel}: ${p.pct}% of wickets.`;
      });
    }
  }
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
          "If the stats include a \"filter\" field, every bullet must stay scoped to that specific angle (that bowling " +
          "type or that dismissal type) -- do not drift into general commentary outside the filter. " +
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

/** Recursively finds the first array of strings inside a parsed JSON value (handles the model wrapping the array in an object key, e.g. {"strategy": [...]}). */
function extractStringArray(value: unknown): string[] | null {
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string")) {
    return value;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      const found = extractStringArray(v);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Models don't reliably follow "reply with a JSON array" -- observed failures include
 * markdown bullets, an array wrapped in an object key, and objects with duplicate keys
 * (e.g. {"-": "...", "-": "...", "-": "..."}) which are syntactically valid JSON but
 * collapse to one entry on parse. This cascades through several recovery strategies
 * before giving up, since the last resort (pulling out long quoted strings) works
 * regardless of which of the above shapes the model produced.
 */
function parseBullets(text: string): string[] {
  // Require at least 2 bullets from every recovery strategy -- a lone sentence
  // (the model occasionally collapses to one line of prose) isn't "bullets",
  // and letting it through looks sparse next to the "up to 3 points" copy.
  // Better to fall through to the next strategy, and ultimately to the
  // guaranteed-multi-bullet rule-based fallback, than show just one.
  try {
    const direct = extractStringArray(JSON.parse(text));
    if (direct && direct.length >= 2) return direct.slice(0, 3);
  } catch {
    // not valid JSON on its own -- keep trying
  }

  const jsonMatch = text.match(/[[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    try {
      const found = extractStringArray(JSON.parse(jsonMatch[0]));
      if (found && found.length >= 2) return found.slice(0, 3);
    } catch {
      // fall through
    }
  }

  const lines = text
    .split("\n")
    .map((line) => line.replace(/^[\s]*[-•*]\s*|^\s*\d+[.)]\s*/, "").trim())
    .filter((l) => l.length > 10);
  if (lines.length >= 2) return lines.slice(0, 3);

  const quoted = [...text.matchAll(/"([^"\\]{15,}(?:\\.[^"\\]*)*)"/g)].map((m) => m[1]);
  if (quoted.length >= 2) return quoted.slice(0, 3);

  throw new Error("malformed Groq bullet response");
}

export async function generateSuggestion(player: PlayerRow, filter?: string | null): Promise<string[]> {
  const facts = await buildFacts(player, filter);
  if (process.env.GROQ_API_KEY) {
    try {
      return await groqPlan(player, facts);
    } catch (err) {
      console.error("Groq suggestion failed, falling back to rule-based:", err);
    }
  }
  return ruleBasedPlan(facts);
}
