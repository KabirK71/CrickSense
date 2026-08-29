// Biographical info CricAPI has that Cricsheet doesn't: date of birth, place
// of birth, batting/bowling style, and a real photo. This is presentational
// context only -- it never feeds the stats engine, which stays Cricsheet-only
// (CricAPI's own "stats" field is a career-total number, a different scope
// than our since-2021 figures, so it's deliberately not shown here to avoid
// two different "runs" numbers appearing side by side).
export type PlayerBio = {
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  battingStyle: string | null;
  bowlingStyle: string | null;
  photoUrl: string | null;
};

async function searchCricApiPlayerId(name: string): Promise<string | null> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.cricapi.com/v1/players?apikey=${key}&offset=0&search=${encodeURIComponent(name)}`,
      { next: { revalidate: 604800 } } // a week -- the roster of who exists doesn't change
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const results = (payload.data ?? []) as { id: string; name: string; country: string }[];
    if (results.length === 0) return null;
    const exact = results.find((r) => r.name.toLowerCase() === name.toLowerCase() && r.country === "Pakistan");
    const pakistani = results.find((r) => r.country === "Pakistan");
    return (exact ?? pakistani ?? results[0]).id;
  } catch (err) {
    console.error("CricAPI player search failed:", err);
    return null;
  }
}

export async function getPlayerBio(name: string): Promise<PlayerBio | null> {
  const key = process.env.CRICAPI_KEY;
  if (!key) return null;

  const id = await searchCricApiPlayerId(name);
  if (!id) return null;

  try {
    const res = await fetch(`https://api.cricapi.com/v1/players_info?apikey=${key}&id=${id}`, {
      next: { revalidate: 604800 }, // a week -- biographical facts don't change
    });
    if (!res.ok) return null;
    const payload = await res.json();
    const data = payload.data as {
      dateOfBirth?: string;
      placeOfBirth?: string;
      battingStyle?: string;
      bowlingStyle?: string;
      playerImg?: string;
    } | null;
    if (!data) return null;

    // CricAPI serves a generic placeholder icon (not a real photo) for
    // players it doesn't have a picture of -- don't show that as if it were one.
    const hasRealPhoto = data.playerImg && !data.playerImg.includes("icon512");

    return {
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split("T")[0] : null,
      placeOfBirth: data.placeOfBirth ?? null,
      battingStyle: data.battingStyle ?? null,
      bowlingStyle: data.bowlingStyle ?? null,
      photoUrl: hasRealPhoto ? data.playerImg! : null,
    };
  } catch (err) {
    console.error("CricAPI player info fetch failed:", err);
    return null;
  }
}
