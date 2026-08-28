import { db } from "@/db";
import { players, iccRankings } from "@/db/schema";
import { eq } from "drizzle-orm";

// See pipeline/scrape_icc_rankings.py for the full rationale: this hits the
// same unauthenticated Sportz.io widget feed icc-cricket.com's own frontend
// calls to render its rankings tables. The client_id is a public widget key
// from icc-cricket.com's page source, not a secret. If ICC changes providers
// or the client_id rotates, this needs a human to re-derive it (see
// NEEDS_YOUR_INPUT.md).
const CLIENT_ID = "tPZJbRgIub3Vua93/DWtyQ==";
const FEED_URL = "https://assets-icc.sportz.io/cricket/v1/ranking";

type RankEntry = {
  no: string;
  "Player-name": string;
  Country: string;
  Points: string;
};

async function fetchRankings(kind: "bat" | "bowl"): Promise<RankEntry[]> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    comp_type: "test",
    lang: "en",
    feed_format: "json",
    type: kind,
  });
  const res = await fetch(`${FEED_URL}?${params}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`ICC rankings feed returned ${res.status}`);
  const payload = await res.json();
  const key = Object.keys(payload.data)[0];
  return payload.data[key].rank as RankEntry[];
}

function resolveRanks(entries: RankEntry[]) {
  const out: { name: string; rank: number; points: number }[] = [];
  let lastRank: number | null = null;
  for (const e of entries) {
    const rank: number = e.no === "=" ? lastRank! : Number(e.no);
    lastRank = rank;
    out.push({ name: e["Player-name"], rank, points: Number(e.Points) });
  }
  return out;
}

export async function refreshIccRankings(): Promise<{ updated: number }> {
  const [bat, bowl] = await Promise.all([fetchRankings("bat"), fetchRankings("bowl")]);
  const resolved = [...resolveRanks(bat), ...resolveRanks(bowl)];

  const pakistanPlayers = await db
    .select({ id: players.id, name: players.name })
    .from(players)
    .where(eq(players.country, "pakistan"));
  const byName = new Map(pakistanPlayers.map((p) => [p.name, p.id]));

  let updated = 0;
  for (const { name, rank, points } of resolved) {
    const playerId = byName.get(name);
    if (!playerId) continue;

    await db.insert(iccRankings).values({ playerId, format: "test", rank, points });
    await db.update(players).set({ iccTestRank: rank }).where(eq(players.id, playerId));
    updated += 1;
  }

  return { updated };
}
