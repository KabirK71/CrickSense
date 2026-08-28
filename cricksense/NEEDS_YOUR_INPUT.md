# Needs your input

Everything buildable without you has been built and works end-to-end against
real data (see progress summary in chat). This file tracks what's left,
why it's blocked on you, and what happens once you unblock it.

---

## 1. Accounts you need to create (build spec section 2)

I can't create accounts or enter credentials on your behalf. For each of
these, create the account, then paste the value into `cricksense/.env.local`
(local dev) and into the Vercel project's environment variables (production)
once the Vercel project exists (#3 below).

- **Neon** (neon.tech) — free Postgres project. Copy the connection string
  into `DATABASE_URL`. Local dev currently runs against a local Postgres
  instead (see #5) so this only blocks production deploy, not local work.
- **Groq** (console.groq.com) — free API key into `GROQ_API_KEY`. Without
  this, `/api/search` and `/api/suggestion/[playerId]` both work today via a
  rule-based fallback (same substring-matching logic as the design
  prototype) — real but less flexible than free-text NL parsing. Everything
  is wired to switch to Groq automatically the moment the key is present, no
  code changes needed.
- **Gemini** (aistudio.google.com) — free API key into `GEMINI_API_KEY`, for
  the one-time quality comparison against Groq (build spec Phase 2, step 9),
  not used in production. Once both keys exist, run:
  ```
  cd cricksense && npm run ai:compare
  ```
  This runs the same 5 sample queries through both models side by side so
  you can eyeball quality before trusting Groq in production.

## 2. Vercel + GitHub deploy (build spec section 2, steps 4-6)

**Found while working on this:** the outer repo already has a GitHub remote
configured (`git@github.com-personal:KabirK71/CrickSense.git`, with
`origin/main` already fetched) — looks like you set this up previously. I
have **not pushed anything** — I only committed locally. Pushing to a real
remote is the kind of action I check with you on first, regardless of how
autonomous the rest of this task is. Say the word and I'll push, or you can
run `git push` yourself.

Once pushed:
1. Create a Vercel account/project, import the GitHub repo, set the **root
   directory to `cricksense/`** (the Next.js app isn't at the repo root —
   the spec/design files sit alongside it).
2. In Vercel project settings → Environment Variables, add all four vars
   from `.env.example`: `DATABASE_URL` (Neon), `GROQ_API_KEY`,
   `GEMINI_API_KEY`, `CRON_SECRET` (already generated in your local
   `.env.local` — reuse the same value so the cron route's auth check
   matches).
3. Deploy. `vercel.json` already declares the weekly ICC-rankings cron
   (`/api/cron/icc-rankings`, Mondays 3am UTC) — Vercel picks it up
   automatically, no extra setup.
4. Once deployed, run the data pipeline once against the **production**
   Neon database to seed it (same commands as local, just with `DATABASE_URL`
   pointed at Neon instead of localhost — see `cricksense/pipeline/`):
   ```
   python3 pipeline/download_cricsheet.py
   python3 pipeline/parse_matches.py
   python3 pipeline/load_to_neon.py
   python3 pipeline/scrape_icc_rankings.py
   ```

## 3. Manual classification data — needs a review pass

Cricsheet's ball-by-ball data has no notion of bowling style, player role,
or squad status — I classified all of this myself from cricketing knowledge
so the pipeline could run today, but it's worth you double-checking since
it drives real analysis:

- **`cricksense/pipeline/bowler_types.py`** — every bowler who appears in a
  Pakistan Test since 2021 (124 of them, opposition included), classified
  pace/spin/swing. The pace/swing split especially is a judgment call (most
  swing bowlers are just pace bowlers who swing it — there's no rigorous
  line). Pakistan's own bowlers I'm confident about; some opposition
  part-time bowlers (e.g. batters who occasionally roll their arm over) are
  lower-confidence guesses, defaulting to "pace" when unclear.
- **`cricksense/pipeline/players_meta.py`** — role (batsman/wicketkeeper/
  fast_bowler/spinner/all_rounder), current-squad flag, and captaincy for
  all 43 Pakistan players in the dataset. This is a snapshot as of when I
  built this (squad selection and captaincy change over time) — re-check
  before relying on it long-term, and update this file + re-run
  `python3 pipeline/load_to_neon.py` when the squad changes.

If you want to fix a name's classification, edit the relevant dict entry and
re-run `load_to_neon.py` — it's idempotent (upserts players by
`cricsheet_name`, so ids stay stable).

## 4. ICC rankings: real data, but from an unofficial feed

ICC's own rankings pages (icc-cricket.com) are a client-rendered React app
with no public API. I found that the page itself pulls its rankings table
from a third-party widget feed (`assets-icc.sportz.io`) using a `client_id`
that's a public key visible in the page's own source — not a secret, and not
something I bypassed any auth or ToS-gated system to get. This is real,
live, current ICC Test ranking data (verified against the actual current
rankings while building this).

Risk: if ICC ever switches data providers or rotates that key, both
`pipeline/scrape_icc_rankings.py` and `src/lib/icc-rankings.ts` (used by the
production cron route) will start failing silently-ish (the cron route
returns a 502 with the error in the response body, so it's at least
visible). Fix, if it ever happens: open the ICC rankings page in a browser,
check Network tab for a request to `assets-icc.sportz.io/cricket/v1/ranking`,
and update `CLIENT_ID` in both files.

## 5. Local dev uses local Postgres, not Neon

`src/db/index.ts` picks the Postgres driver based on whether `DATABASE_URL`
contains `neon.tech`: Neon's serverless driver in production, plain
`node-postgres` locally. This let me stand up a real database
(`createdb cricksense`, via your already-running Homebrew Postgres) and run
the actual pipeline against real 2021+ Pakistan Test data without needing
your Neon credentials — everything in this build (schema, 39 real matches,
73k real deliveries, real stats, real ICC ranks) has been verified against
this local database. It's the same schema and query code either way, so
switching `DATABASE_URL` to Neon for production is a one-line env change,
nothing to port.

## 6. Player photos — explicitly flagged in the requirements doc too

No player photos anywhere — squad grid and player pages use initials on a
gradient placeholder (matches the design mockup, which does the same). The
requirements PDF itself flags this: "Licensing to be checked before public
launch." Sourcing and clearing real photos is on you; `players.photo_url` in
the schema is ready to receive URLs whenever you have them (nullable,
already wired into every place a photo would render).

## 7. Out of scope, confirmed not built (per requirements PDF section 2)

Live match data, T20/ODI backing logic, any country other than Pakistan,
line/length or pitch-map analysis, self-hosted AI models. Nav items and the
countries menu show these as "Soon" — UI only, as specced.

---

## What's fully working right now

Everything else in the build spec's 9 phases: Next.js app scaffolded, full
Drizzle schema, real Cricsheet data pipeline (39 Pakistan Tests since 2021,
73,309 real deliveries, loaded and verified against known figures), live ICC
rankings for 17 current squad members, all 9 API routes, both pages built to
match the Claude Design export exactly (colors, type, spacing), AI search
with working rule-based fallback, AI tactical suggestions, PDF export for
both the dashboard and player reports, and the ICC-rankings cron route +
`vercel.json` schedule. `npm run build` and `npx eslint .` both pass clean.
The dev server has been running throughout at `localhost:3000` if you want
to poke at it yourself before anything is deployed.
