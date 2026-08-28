"""
Scrape current ICC Test rankings (batting + bowling) for Pakistan players.

ICC's own rankings pages (icc-cricket.com) are a client-rendered SPA with no
documented public API. The page itself loads its rankings table from a
third-party widget feed operated by Sportz.io, which is unauthenticated and
publicly reachable -- this is the same feed icc-cricket.com's own frontend
calls, just requested directly instead of via a headless browser. The
`client_id` below is a public widget key visible in icc-cricket.com's page
source, not a secret.

If Sportz.io ever changes shape or the client_id rotates, this needs a human
to re-derive it (open the ICC rankings page, check network requests for
`assets-icc.sportz.io/cricket/v1/ranking`, and update CLIENT_ID below) --
flagged in NEEDS_YOUR_INPUT.md.

This same logic (fetch, parse, upsert) is ported to src/lib/icc-rankings.ts
for use by the live /api/cron/icc-rankings route; this script is for manual/
local runs, e.g. to seed rankings before the cron job ever runs.
"""
import json
import os
import urllib.parse
import urllib.request
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env.local")

CLIENT_ID = "tPZJbRgIub3Vua93/DWtyQ=="
FEED_URL = "https://assets-icc.sportz.io/cricket/v1/ranking"


def fetch_rankings(kind: str) -> list[dict]:
    """kind: 'bat' or 'bowl'"""
    params = {
        "client_id": CLIENT_ID,
        "comp_type": "test",
        "lang": "en",
        "feed_format": "json",
        "type": kind,
    }
    url = f"{FEED_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        payload = json.load(resp)
    data = payload["data"]
    key = next(iter(data))
    return data[key]["rank"]


def resolve_ranks(entries: list[dict]) -> list[tuple[str, int, int]]:
    """Returns (player_name, rank, points), carrying tied ('=') ranks forward."""
    out = []
    last_rank = None
    for e in entries:
        no = e["no"]
        rank = last_rank if no == "=" else int(no)
        last_rank = rank
        out.append((e["Player-name"], rank, int(e["Points"])))
    return out


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL not set (checked .env.local)")

    bat = [r for r in resolve_ranks(fetch_rankings("bat"))]
    bowl = [r for r in resolve_ranks(fetch_rankings("bowl"))]

    conn = psycopg2.connect(database_url)
    updated = 0
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM players WHERE country = 'pakistan'")
            by_name = {name: pid for pid, name in cur.fetchall()}

            for name, rank, points in bat + bowl:
                player_id = by_name.get(name)
                if player_id is None:
                    continue
                cur.execute(
                    """
                    INSERT INTO icc_rankings (player_id, format, rank, points, updated_at)
                    VALUES (%s, 'test', %s, %s, now())
                    """,
                    (player_id, rank, points),
                )
                cur.execute(
                    "UPDATE players SET icc_test_rank = %s WHERE id = %s",
                    (rank, player_id),
                )
                updated += 1
        conn.commit()
    finally:
        conn.close()

    print(f"Updated ICC Test rank for {updated} Pakistan players.")


if __name__ == "__main__":
    main()
