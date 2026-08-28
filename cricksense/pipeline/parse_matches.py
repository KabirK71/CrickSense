"""
Parse raw Cricsheet JSON (from download_cricsheet.py) into flat ball-by-ball
records, filtered to Pakistan Test matches from 2021 onwards.

Writes pipeline/data/parsed.json, consumed by load_to_neon.py.
"""
import json
from pathlib import Path

from bowler_types import get_bowler_type

RAW_DIR = Path(__file__).parent / "data" / "raw"
OUT_PATH = Path(__file__).parent / "data" / "parsed.json"

DISMISSAL_MAP = {
    "caught": "caught",
    "caught and bowled": "caught",
    "bowled": "bowled",
    "lbw": "lbw",
    "run out": "run_out",
    "stumped": "stumped",
}


def format_outcome(outcome: dict) -> str:
    if not outcome:
        return "Result unknown"
    if outcome.get("result") == "draw":
        return "Match drawn"
    if outcome.get("result") == "tie":
        return "Match tied"
    winner = outcome.get("winner")
    if not winner:
        return "Result unknown"
    by = outcome.get("by", {})
    if "wickets" in by:
        return f"{winner} won by {by['wickets']} wickets"
    if "runs" in by:
        return f"{winner} won by {by['runs']} runs"
    if "innings" in by:
        extra = f" and {by['runs']} runs" if "runs" in by else ""
        return f"{winner} won by an innings{extra}"
    return f"{winner} won"


def phase_for_over(over: int) -> str:
    if over < 10:
        return "overs_1_10"
    if over < 40:
        return "overs_11_40"
    return "overs_40_plus"


def ball_number(actual_delivery: str, fallback: int) -> int:
    try:
        frac = actual_delivery.split(".")[1]
        return int(frac)
    except (IndexError, ValueError):
        return fallback


def parse_match(data: dict, cricsheet_id: str) -> dict | None:
    info = data["info"]
    if info.get("match_type") != "Test":
        return None
    dates = info.get("dates") or []
    if not dates or dates[0] < "2021-01-01":
        return None
    teams = info.get("teams", [])
    if "Pakistan" not in teams:
        return None
    opponent = next((t for t in teams if t != "Pakistan"), "Unknown")
    outcome = info.get("outcome", {})
    result = format_outcome(outcome)

    innings_out = []
    for inn_idx, inn in enumerate(data.get("innings", []), start=1):
        team = inn["team"]
        deliveries_out = []
        for over_block in inn.get("overs", []):
            over = over_block["over"]
            phase = phase_for_over(over)
            for i, ball in enumerate(over_block.get("deliveries", []), start=1):
                runs = ball.get("runs", {})
                wickets = ball.get("wickets") or []
                wicket = wickets[0] if wickets else None
                dismissal_type = None
                dismissed_player = None
                if wicket:
                    dismissal_type = DISMISSAL_MAP.get(wicket.get("kind"), "other")
                    dismissed_player = wicket.get("player_out")
                bowler = ball["bowler"]
                extras_detail = ball.get("extras") or {}
                is_legal = "wides" not in extras_detail and "noballs" not in extras_detail
                bowler_runs = (
                    runs.get("batter", 0)
                    + extras_detail.get("wides", 0)
                    + extras_detail.get("noballs", 0)
                )
                deliveries_out.append(
                    {
                        "over": over,
                        "ball": ball_number(ball.get("actual_delivery", ""), i),
                        "batsman": ball["batter"],
                        "bowler": bowler,
                        "bowler_type": get_bowler_type(bowler),
                        "runs": runs.get("batter", 0),
                        "extras": runs.get("extras", 0),
                        "bowler_runs": bowler_runs,
                        "is_legal_delivery": is_legal,
                        "is_wicket": bool(wickets),
                        "dismissal_type": dismissal_type,
                        "dismissed_player": dismissed_player,
                        "phase": phase,
                    }
                )
        innings_out.append(
            {"team": team, "innings_number": inn_idx, "deliveries": deliveries_out}
        )

    return {
        "cricsheet_id": cricsheet_id,
        "opponent": opponent,
        "venue": info.get("venue"),
        "start_date": dates[0],
        "format": "test",
        "result": result,
        "innings": innings_out,
    }


def main() -> None:
    if not RAW_DIR.exists():
        raise SystemExit(f"{RAW_DIR} not found -- run download_cricsheet.py first")

    matches = []
    players: set[str] = set()
    player_country: dict[str, str] = {}

    for path in sorted(RAW_DIR.glob("*.json")):
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        cricsheet_id = path.stem
        parsed = parse_match(data, cricsheet_id)
        if parsed is None:
            continue
        matches.append(parsed)
        for team, names in data["info"].get("players", {}).items():
            for name in names:
                players.add(name)
                player_country.setdefault(name, team)

    payload = {
        "players": [
            {"cricsheet_name": name, "team": player_country[name]}
            for name in sorted(players)
        ],
        "matches": matches,
    }
    OUT_PATH.write_text(json.dumps(payload))
    total_balls = sum(len(i["deliveries"]) for m in matches for i in m["innings"])
    print(
        f"Parsed {len(matches)} Test matches, {len(players)} players, "
        f"{total_balls:,} deliveries -> {OUT_PATH}"
    )


if __name__ == "__main__":
    main()
