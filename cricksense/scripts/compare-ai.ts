/**
 * Build spec section 2 (Phase 2, step 9): compare Groq vs Gemini output
 * quality on the same intent-parsing prompts before committing to Groq as
 * the production AI layer (see CRICKSENSE_BUILD_SPEC.md section 1 -- Gemini
 * is for this side-by-side test only, never called in production).
 *
 * Needs both GROQ_API_KEY and GEMINI_API_KEY in .env.local. Run with:
 *   npx tsx -r dotenv/config scripts/compare-ai.ts dotenv_config_path=.env.local
 */
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCurrentSquad } from "../src/db/queries";
import { FILTER_LABELS } from "../src/lib/search";

const QUERIES = [
  "Babar Azam vs spin",
  "how does Shaheen do in the first 10 overs",
  "who struggles against left arm spin",
  "Noman Ali wicket types",
  "rizwan against pace bowling",
];

async function main() {
  const squad = await getCurrentSquad();
  const roster = squad.map((p) => p.name);
  const systemPrompt =
    "You extract structured intent from a cricket-analytics search query. " +
    `The squad is: ${roster.join(", ")}. ` +
    `Valid filters: ${Object.keys(FILTER_LABELS).join(", ")}. ` +
    'Reply with ONLY compact JSON: {"player": "<exact roster name or null>", "filter": "<one of the valid filters or null>"}. ' +
    "Match the player even with nicknames or misspellings. No prose, no markdown.";

  const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
  const gemini = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" })
    : null;

  if (!groq && !gemini) {
    console.error("Set GROQ_API_KEY and/or GEMINI_API_KEY in .env.local first.");
    process.exit(1);
  }

  for (const query of QUERIES) {
    console.log(`\n=== "${query}" ===`);

    if (groq) {
      const t0 = Date.now();
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        temperature: 0,
        max_tokens: 200,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
      });
      console.log(`Groq   (${Date.now() - t0}ms):`, completion.choices[0]?.message?.content?.trim());
    }

    if (gemini) {
      const t0 = Date.now();
      const result = await gemini.generateContent(`${systemPrompt}\n\nQuery: ${query}`);
      console.log(`Gemini (${Date.now() - t0}ms):`, result.response.text().trim());
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
