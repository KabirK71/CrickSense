// Fills the gap Cricsheet can't: Cricsheet only has fully-finished matches
// (see NEEDS_YOUR_INPUT.md / chat history), so a series in progress right
// now is invisible to the rest of this app for days after it starts. CricAPI
// (cricapi.com / cricketdata.org, free tier) gives a lightweight match
// status -- not ball-by-ball detail, just "what's the state of the game" --
// which is all the homepage headline card needs. Deep stats (dismissal
// breakdowns, suggested plans, etc.) still come from Cricsheet exclusively
// once it catches up.
type CricApiMatch = {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  teams: string[];
  teamInfo?: { name: string; shortname: string; img?: string }[];
  score?: { r: number; w: number; o: number; inning: string }[];
  matchStarted: boolean;
  matchEnded: boolean;
  hasSquad?: boolean;
};

export type LiveSeriesStatus = {
  matchId: string;
  isLive: boolean;
  opponent: string;
  seriesLabel: string | null;
  venue: string;
  date: string;
  status: string;
  scoreLine: string | null;
  hasSquad: boolean;
};

export type LiveSquadEntry = {
  name: string;
  role: string | null;
  bowlingStyle: string | null;
};

function seriesLabel(name: string): string | null {
  // "England vs Pakistan, 2nd Test, Pakistan tour of England 2026" -> "2nd Test"
  const match = name.match(/,\s*(\d+\w{0,2}\s+Test)\b/i);
  return match ? match[1] : null;
}

function formatScoreLine(m: CricApiMatch): string | null {
  if (!m.score || m.score.length === 0) return null;
  return m.score
    .map((s) => {
      const teamName = s.inning.replace(/\s+Inning\s+\d+$/i, "");
      const short = m.teamInfo?.find((t) => t.name === teamName)?.shortname ?? teamName;
      return `${short} ${s.r}/${s.w}`;
    })
    .join(" · ");
}

/** Shared fetch of the currentMatches feed -- Next.js dedupes/caches identical fetch calls, so callers of this and getTeamBadges() don't cost extra CricAPI hits within the revalidate window. */
async function fetchCurrentMatches(): Promise<CricApiMatch[] | null> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${key}&offset=0`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    return (payload.data ?? []) as CricApiMatch[];
  } catch (err) {
    console.error("CricAPI fetch failed:", err);
    return null;
  }
}

/**
 * Best-effort team badge/flag lookup for teams that aren't real ISO countries
 * (England, West Indies) and so don't appear in the countries endpoint's
 * generic-flag list -- see country-flags.ts. Only resolves for teams that
 * happen to have a match in the current live/recent window; there's no
 * dedicated "teams" endpoint to look these up unconditionally.
 */
export async function getTeamBadges(): Promise<Record<string, string>> {
  const matches = await fetchCurrentMatches();
  if (!matches) return {};
  const badges: Record<string, string> = {};
  for (const m of matches) {
    for (const t of m.teamInfo ?? []) {
      if (t.img && !badges[t.name]) badges[t.name] = t.img;
    }
  }
  return badges;
}

export async function getCurrentPakistanTest(): Promise<LiveSeriesStatus | null> {
  const allMatches = await fetchCurrentMatches();
  if (!allMatches) return null;

  try {
    const pakistanTests = allMatches.filter((m) => m.matchType === "test" && m.teams.includes("Pakistan"));
    if (pakistanTests.length === 0) return null;

    const live = pakistanTests.find((m) => m.matchStarted && !m.matchEnded);
    const chosen = live ?? [...pakistanTests].sort((a, b) => b.date.localeCompare(a.date))[0];

    return {
      matchId: chosen.id,
      isLive: chosen.matchStarted && !chosen.matchEnded,
      opponent: chosen.teams.find((t) => t !== "Pakistan") ?? "Unknown",
      seriesLabel: seriesLabel(chosen.name),
      venue: chosen.venue,
      date: chosen.date,
      status: chosen.status,
      scoreLine: formatScoreLine(chosen),
      hasSquad: Boolean(chosen.hasSquad),
    };
  } catch (err) {
    console.error("CricAPI fetch failed:", err);
    return null;
  }
}

export async function getLiveSquad(matchId: string): Promise<LiveSquadEntry[] | null> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://api.cricapi.com/v1/match_squad?apikey=${key}&id=${matchId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const teams = (payload.data ?? []) as { teamName: string; players: { name: string; role?: string; bowlingStyle?: string }[] }[];
    const pakistan = teams.find((t) => t.teamName === "Pakistan");
    if (!pakistan) return null;
    return pakistan.players.map((p) => ({
      name: p.name,
      role: p.role ?? null,
      bowlingStyle: p.bowlingStyle ?? null,
    }));
  } catch (err) {
    console.error("CricAPI squad fetch failed:", err);
    return null;
  }
}
