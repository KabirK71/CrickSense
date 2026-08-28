# CrickSense — build spec for Claude Code

This file is written to be handed directly to Claude Code. It should set up and build the
project with minimal back-and-forth. Human-only steps are clearly marked — do those before
or alongside running Claude Code.

Full product context (vision, scope, wireframes) is in `cricksense_v1_requirements.pdf`,
in the same folder. Read that first for the "why"; this file is the "how."

If a visual design export from Claude Design is included alongside this file, treat it as
the source of truth for layout and styling over the lo-fi wireframes in the PDF.

---

## 1. Tech stack (already decided — do not re-litigate)

- Framework: Next.js (App Router, TypeScript, Tailwind) — frontend and backend in one repo
- Hosting: Vercel (free tier)
- Database: Neon (serverless Postgres, free tier)
- ORM: Drizzle
- AI: Groq (primary, free API, hosted open-source models) — Gemini used only for a side-by-side
  quality comparison during testing, not in production by default
- Charts: Recharts
- PDF export: @react-pdf/renderer (pure JS, no headless browser needed)
- Data pipeline: standalone Python scripts (not part of the Next.js app), run manually/on a
  schedule to populate Neon

---

## 2. MANUAL STEPS — the human does these, Claude Code cannot

1. Create a free Neon account at neon.tech, create a project, copy the connection string.
2. Create a free Groq account at console.groq.com, generate an API key.
3. Create a free Gemini API key at aistudio.google.com (for testing only).
4. Create a Vercel account and link it to the GitHub repo Claude Code initializes.
5. In Vercel project settings, add the environment variables listed in section 4 below.
6. Push the repo to GitHub (Claude Code can do the local git init and first commit, but
   creating the remote GitHub repo and authenticating may need the human, depending on
   what's already configured).

---

## 3. Project setup commands

Run in order:

```bash
npx create-next-app@latest cricksense --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd cricksense

npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit dotenv

npm install groq-sdk @google/generative-ai
npm install recharts
npm install @react-pdf/renderer
npm install lucide-react
```

Create `drizzle.config.ts` at the project root pointing at `DATABASE_URL` and a schema file
at `src/db/schema.ts` (see section 5 for the schema to implement).

---

## 4. Environment variables

Create `.env.local` (never commit this) and a matching `.env.example` (commit this, values blank):

```
DATABASE_URL=
GROQ_API_KEY=
GEMINI_API_KEY=
CRON_SECRET=
```

`CRON_SECRET` is a random string used to verify Vercel's scheduled cron requests hit the
ICC-ranking-refresh route and not just anyone.

---

## 5. Database schema (Drizzle, Postgres via Neon)

Tables to create in `src/db/schema.ts`:

- **players** — id, name, role (batsman / wicketkeeper / fast_bowler / spinner / all_rounder),
  photo_url, country (default 'pakistan'), icc_test_rank (nullable, updated by cron)
- **matches** — id, opponent, venue, start_date, format (default 'test')
- **innings** — id, match_id (fk), team, innings_number
- **deliveries** — id, innings_id (fk), over, ball, batsman_id (fk players), bowler_id (fk players),
  bowler_type (pace / spin / swing), runs, extras, is_wicket, dismissal_type (caught / lbw / bowled /
  run_out / stumped / other), phase (derived: overs 1–10 / 11–40 / 40+)
- **icc_rankings** — player_id (fk), format, rank, points, updated_at

Write the aggregation queries (not raw tables, but views or query functions) for:
- runs, average, strike rate per player
- dismissal type % per player
- dismissals by bowler type % per player
- performance by innings phase

---

## 6. API routes to build (Next.js route handlers under `src/app/api/`)

| Route | Method | Purpose |
|---|---|---|
| `/api/series` | GET | Current/most recent series + scoreboard |
| `/api/squad` | GET | Squad list: photo, name, role |
| `/api/player/[id]` | GET | Full player detail: stats, ICC rank, dismissal breakdowns |
| `/api/performers` | GET | Top/bottom performers for the homepage |
| `/api/highlights` | GET | Rule-based highlight/insight cards |
| `/api/search` | POST | Takes free text, calls Groq to parse intent, returns `{player, filter, viewType}` |
| `/api/suggestion/[playerId]` | GET | AI-generated one-line tactical suggestion (Groq) |
| `/api/pdf/[view]` | GET | Server-rendered PDF of the requested view via @react-pdf/renderer |
| `/api/cron/icc-rankings` | GET | Scheduled job (Vercel cron), scrapes ICC rankings, requires `CRON_SECRET` header |

Add the cron schedule in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/icc-rankings", "schedule": "0 3 * * 1" }
  ]
}
```

(Runs weekly, Monday 3am UTC — adjust if needed.)

---

## 7. Pages and components

- `src/app/page.tsx` — homepage: nav bar (Test active, T20/ODI "Soon"), countries hamburger
  menu (Pakistan selected, others "Soon"), search bar, live series card, squad grid (3 columns,
  photo + name + role), top/bottom performer cards, highlight cards
- `src/app/player/[id]/page.tsx` — player detail: header, stat cards (runs, average, ICC rank,
  strike rate), dismissals-by-bowler-type bars, dismissal-type breakdown, AI suggested plan box,
  PDF download button
- `src/components/NavBar.tsx`
- `src/components/CountriesMenu.tsx`
- `src/components/SearchBar.tsx` (with dropdown: understood-intent line + 3 jump options)
- `src/components/SquadGrid.tsx`
- `src/components/PlayerStatsCards.tsx`
- `src/components/DismissalBars.tsx`
- `src/components/HighlightCard.tsx`

Match the lo-fi structure in the requirements PDF section 5, or the Claude Design export if
one is provided alongside this file.

---

## 8. Data pipeline (Python, separate from the Next.js app — put in `/pipeline`)

- `pipeline/download_cricsheet.py` — download Pakistan Test match files, 2021–present, from Cricsheet
- `pipeline/parse_matches.py` — parse into flat ball-by-ball records
- `pipeline/load_to_neon.py` — load parsed records into the Neon database via `DATABASE_URL`
- `pipeline/scrape_icc_rankings.py` — logic used by the `/api/cron/icc-rankings` route (or called by it)

These are run manually the first time to seed the database, then the cron route handles the
ICC-ranking refresh going forward. Match data refresh (new Test matches) stays manual for V1 —
re-run the pipeline scripts after a series ends.

---

## 9. Build order — do these phases in sequence

1. Project setup (section 3), confirm a blank Next.js app deploys to Vercel.
2. Connect Neon, implement schema (section 5), confirm connection works.
3. Run the data pipeline scripts locally once, confirm data lands in Neon.
4. Build API routes one at a time (section 6), test each with sample data before moving on.
5. Build components and pages (section 7), wiring each to its API route as it's built.
6. Wire the search bar to `/api/search`, confirm the jump-to-view behavior works end to end.
7. Build PDF export last, once the pages it captures are stable.
8. Set up the ICC ranking cron route and `vercel.json` schedule.
9. Deploy, smoke-test every page and route in production before considering V1 done.

---

## 10. Explicitly out of scope — do not build these

- Live match/live score data
- T20 or ODI data (nav items exist as UI only, marked "Soon", no backing logic)
- Any country other than Pakistan (countries menu is UI only for the rest, marked "Soon")
- Line/length or pitch-map analysis
- Self-hosted AI models
