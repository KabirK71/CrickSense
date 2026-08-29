// Flag URLs for the 10 nav countries that are real ISO nations, sourced
// directly from CricAPI's `countries` endpoint (verified by calling it
// live -- these are the actual genericFlag values it returned, not
// guessed). England and West Indies aren't sovereign ISO countries, so
// they don't appear in that endpoint at all; their badges (when available)
// come from live-series.ts's getTeamBadges() instead, which is a
// best-effort lookup against whatever matches happen to be live/recent.
export const COUNTRY_FLAGS: Record<string, string> = {
  Pakistan: "https://cdorg.b-cdn.net/flags/generic/PK.svg",
  Australia: "https://cdorg.b-cdn.net/flags/generic/AU.svg",
  India: "https://cdorg.b-cdn.net/flags/generic/IN.svg",
  "South Africa": "https://cdorg.b-cdn.net/flags/generic/ZA.svg",
  "Sri Lanka": "https://cdorg.b-cdn.net/flags/generic/LK.svg",
  "New Zealand": "https://cdorg.b-cdn.net/flags/generic/NZ.svg",
  Bangladesh: "https://cdorg.b-cdn.net/flags/generic/BD.svg",
  Afghanistan: "https://cdorg.b-cdn.net/flags/generic/AF.svg",
  Zimbabwe: "https://cdorg.b-cdn.net/flags/generic/ZW.svg",
  Ireland: "https://cdorg.b-cdn.net/flags/generic/IE.svg",
};
