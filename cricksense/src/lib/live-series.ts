// CricAPI client used ONLY by the daily refresh-live-status cron (see
// src/lib/pipeline/refresh-live-status.ts) -- never called from a page
// render. CricAPI's free tier caps out at 100 requests/day, so this whole
// module exists to ask it exactly once a day, at 8:30am Pakistan time, and
// save the answer to our own database. No live score, no ball-by-ball detail
// -- just "who is Pakistan playing, and when," which is all the homepage
// headline needs.
export type CricApiMatch = {
  id: string;
  name: string;
  matchType: string;
  status: string;
  venue: string;
  date: string;
  dateTimeGMT?: string;
  teams: string[];
  teamInfo?: { name: string; shortname: string; img?: string }[];
  matchStarted: boolean;
  matchEnded: boolean;
  hasSquad?: boolean;
};

export type PakistanFixture = {
  matchId: string;
  opponent: string;
  opponentBadgeUrl: string | null;
  pakistanBadgeUrl: string | null;
  venue: string;
  seriesLabel: string | null;
  matchDate: string;
  matchDateTimeGmt: string | null;
  isToday: boolean;
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

async function fetchCurrentMatches(key: string): Promise<CricApiMatch[] | null> {
  try {
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${key}&offset=0`);
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload.status !== "success") {
      console.error("CricAPI currentMatches failed:", payload.reason ?? payload.status);
      return null;
    }
    return (payload.data ?? []) as CricApiMatch[];
  } catch (err) {
    console.error("CricAPI fetch failed:", err);
    return null;
  }
}

/** Today's Pakistan Test if one is on, else the soonest upcoming one CricAPI's current window knows about. */
function pickFixture(matches: CricApiMatch[], todayIso: string): CricApiMatch | null {
  const pakistanTests = matches.filter((m) => m.matchType === "test" && m.teams.includes("Pakistan"));
  if (pakistanTests.length === 0) return null;

  const today = pakistanTests.find((m) => m.date === todayIso);
  if (today) return today;

  const upcoming = pakistanTests
    .filter((m) => m.date > todayIso)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length > 0) return upcoming[0];

  // Nothing today or upcoming in CricAPI's window -- don't fall back to an
  // old finished match here, the DB's own Cricsheet match already covers that.
  return null;
}

/** One CricAPI call, picks the fixture, and returns everything the homepage needs to know. Returns null if CricAPI has nothing relevant right now. */
export async function fetchPakistanFixture(): Promise<PakistanFixture | null> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return null;

  const matches = await fetchCurrentMatches(key);
  if (!matches) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const chosen = pickFixture(matches, todayIso);
  if (!chosen) return null;

  const opponent = chosen.teams.find((t) => t !== "Pakistan") ?? "Unknown";
  const badgeFor = (team: string) => chosen.teamInfo?.find((t) => t.name === team)?.img ?? null;

  return {
    matchId: chosen.id,
    opponent,
    opponentBadgeUrl: badgeFor(opponent),
    pakistanBadgeUrl: badgeFor("Pakistan"),
    venue: chosen.venue,
    seriesLabel: seriesLabel(chosen.name),
    matchDate: chosen.date,
    matchDateTimeGmt: chosen.dateTimeGMT ?? null,
    isToday: chosen.date === todayIso,
    hasSquad: Boolean(chosen.hasSquad),
  };
}

export async function getLiveSquad(matchId: string): Promise<LiveSquadEntry[] | null> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return null;

  try {
    const res = await fetch(`https://api.cricapi.com/v1/match_squad?apikey=${key}&id=${matchId}`);
    if (!res.ok) return null;
    const payload = await res.json();
    if (payload.status !== "success") {
      console.error("CricAPI match_squad failed:", payload.reason ?? payload.status);
      return null;
    }
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
