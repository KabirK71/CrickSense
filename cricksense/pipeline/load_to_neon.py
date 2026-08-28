"""
Load pipeline/data/parsed.json (produced by parse_matches.py) into Postgres
(Neon in production, local Postgres in dev -- same schema either way).

Players are upserted by cricsheet_name so ids stay stable across re-runs
(icc_rankings references player_id). Matches/innings/deliveries are fully
replaced on every run -- this pipeline is meant to be re-run wholesale after
a series ends (see build spec section 8), not incrementally patched.
"""
import json
import os
from pathlib import Path

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

from players_meta import get_player_meta

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env.local")

PARSED_PATH = Path(__file__).parent / "data" / "parsed.json"


def get_conn():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL not set (checked .env.local)")
    return psycopg2.connect(url)


def upsert_players(cur, players: list[dict]) -> dict[str, int]:
    rows = []
    for p in players:
        name = p["cricsheet_name"]
        team = p["team"]
        if team == "Pakistan":
            role, role_label, is_current, is_captain, display_name = get_player_meta(name)
            country = "pakistan"
        else:
            role, role_label, is_current, is_captain = "batsman", "Player", False, False
            display_name = name
            country = team.lower().replace(" ", "_")
        rows.append((display_name, role_label, role, country, name, is_current, is_captain))

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO players (name, role_label, role, country, cricsheet_name, is_current_squad, is_captain)
        VALUES %s
        ON CONFLICT (cricsheet_name) DO UPDATE SET
          name = EXCLUDED.name,
          role_label = EXCLUDED.role_label,
          role = EXCLUDED.role,
          country = EXCLUDED.country,
          is_current_squad = EXCLUDED.is_current_squad,
          is_captain = EXCLUDED.is_captain
        """,
        rows,
    )
    cur.execute("SELECT id, cricsheet_name FROM players WHERE cricsheet_name IS NOT NULL")
    return {name: pid for pid, name in cur.fetchall()}


def load_matches(cur, matches: list[dict], player_ids: dict[str, int]) -> None:
    cur.execute("TRUNCATE deliveries, innings, matches RESTART IDENTITY CASCADE")

    for m in matches:
        cur.execute(
            """
            INSERT INTO matches (cricsheet_id, opponent, venue, start_date, format, result)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (m["cricsheet_id"], m["opponent"], m["venue"], m["start_date"], m["format"], m["result"]),
        )
        match_id = cur.fetchone()[0]

        for inn in m["innings"]:
            cur.execute(
                "INSERT INTO innings (match_id, team, innings_number) VALUES (%s, %s, %s) RETURNING id",
                (match_id, inn["team"], inn["innings_number"]),
            )
            innings_id = cur.fetchone()[0]

            rows = []
            for d in inn["deliveries"]:
                rows.append(
                    (
                        innings_id,
                        d["over"],
                        d["ball"],
                        player_ids.get(d["batsman"]),
                        player_ids.get(d["bowler"]),
                        d["bowler_type"],
                        d["runs"],
                        d["extras"],
                        d["bowler_runs"],
                        d["is_legal_delivery"],
                        d["is_wicket"],
                        d["dismissal_type"],
                        player_ids.get(d["dismissed_player"]) if d["dismissed_player"] else None,
                        d["phase"],
                    )
                )
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO deliveries
                  (innings_id, over, ball, batsman_id, bowler_id, bowler_type,
                   runs, extras, bowler_runs, is_legal_delivery, is_wicket,
                   dismissal_type, dismissed_player_id, phase)
                VALUES %s
                """,
                rows,
            )


def main() -> None:
    if not PARSED_PATH.exists():
        raise SystemExit(f"{PARSED_PATH} not found -- run parse_matches.py first")
    payload = json.loads(PARSED_PATH.read_text())

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            player_ids = upsert_players(cur, payload["players"])
            load_matches(cur, payload["matches"], player_ids)
        conn.commit()
    finally:
        conn.close()

    n_matches = len(payload["matches"])
    n_balls = sum(len(i["deliveries"]) for m in payload["matches"] for i in m["innings"])
    print(f"Loaded {n_matches} matches, {len(player_ids)} players, {n_balls:,} deliveries.")


if __name__ == "__main__":
    main()
