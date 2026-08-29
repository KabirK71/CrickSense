import Groq from "groq-sdk";
import { getCurrentSquad } from "@/db/queries";

export const FILTER_LABELS: Record<string, string> = {
  spin: "spin bowlers",
  pace: "pace bowlers",
  swing: "swing bowlers",
  lbw: "LBW dismissals",
  caught: "caught dismissals",
  bowled: "bowled dismissals",
};

export type SearchIntent = {
  understood: boolean;
  player: { id: number; name: string } | null;
  filter: string | null;
  filterLabel: string | null;
};

/** Rule-based intent parse -- same substring-match logic as the design prototype. */
async function ruleBasedParse(query: string): Promise<SearchIntent> {
  const squad = await getCurrentSquad();
  const s = query.toLowerCase().trim();
  if (!s) return { understood: false, player: null, filter: null, filterLabel: null };

  let hit: { id: number; name: string } | null = null;
  for (const p of squad) {
    const words = p.name.toLowerCase().split(/[\s.]+/);
    if (words.some((w) => w.length > 2 && s.includes(w))) {
      hit = { id: p.id, name: p.name };
      break;
    }
  }

  let filter: string | null = null;
  for (const key of Object.keys(FILTER_LABELS)) {
    if (s.includes(key)) {
      filter = key;
      break;
    }
  }

  return {
    understood: hit !== null,
    player: hit,
    filter,
    filterLabel: filter ? FILTER_LABELS[filter] : null,
  };
}

/** Groq-powered intent parse for free-form phrasing the rule-based matcher would miss. */
async function groqParse(query: string): Promise<SearchIntent> {
  const squad = await getCurrentSquad();
  const roster = squad.map((p) => p.name);
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,
    max_tokens: 200,
    reasoning_effort: "low",
    messages: [
      {
        role: "system",
        content:
          "You extract structured intent from a cricket-analytics search query. " +
          `The squad is: ${roster.join(", ")}. ` +
          `Valid filters: ${Object.keys(FILTER_LABELS).join(", ")}. ` +
          'Reply with ONLY compact JSON: {"player": "<exact roster name or null>", "filter": "<one of the valid filters or null>"}. ' +
          "Match the player even with nicknames or misspellings. No prose, no markdown.",
      },
      { role: "user", content: query },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "{}";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

  const player = squad.find((p) => p.name === parsed.player) ?? null;
  const filter = typeof parsed.filter === "string" && parsed.filter in FILTER_LABELS ? parsed.filter : null;

  return {
    understood: player !== null,
    player: player ? { id: player.id, name: player.name } : null,
    filter,
    filterLabel: filter ? FILTER_LABELS[filter] : null,
  };
}

export async function parseSearchQuery(query: string): Promise<SearchIntent> {
  if (process.env.GROQ_API_KEY) {
    try {
      return await groqParse(query);
    } catch (err) {
      console.error("Groq intent parse failed, falling back to rule-based:", err);
    }
  }
  return ruleBasedParse(query);
}
