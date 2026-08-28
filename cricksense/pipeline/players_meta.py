"""
Pakistan player metadata: role classification, current-squad flag, captaincy,
and display-name overrides.

Cricsheet gives us names and ball-by-ball appearances only -- no role, squad
status, or captaincy. This table is manually curated from public cricketing
knowledge for every Pakistan player who appears in a Test from 2021 onwards.
Flagged for human review in NEEDS_YOUR_INPUT.md: squad status and captaincy
drift over time (retirements, selection changes) and should be reviewed
periodically -- this snapshot reflects the squad as of mid-2026.

role must be one of: batsman, wicketkeeper, fast_bowler, spinner, all_rounder
(matches the player_role enum in src/db/schema.ts).
"""

# name -> (role, role_label, is_current_squad, is_captain, display_name)
PLAYERS_META: dict[str, tuple[str, str, bool, bool, str]] = {
    "Aamer Jamal":          ("all_rounder",  "All-rounder",  False, False, "Aamer Jamal"),
    "Abdullah Fazal":       ("batsman",      "Batsman",      False, False, "Abdullah Fazal"),
    "Abdullah Shafique":    ("batsman",      "Opener",       True,  False, "Abdullah Shafique"),
    "Abid Ali":             ("batsman",      "Opener",       False, False, "Abid Ali"),
    "Abrar Ahmed":          ("spinner",      "Spinner",      True,  False, "Abrar Ahmed"),
    "Agha Salman":          ("all_rounder",  "All-rounder",  True,  False, "Salman Agha"),
    "Ali Usman":            ("batsman",      "Batsman",      False, False, "Ali Usman"),
    "Asif Afridi":          ("spinner",      "Spinner",      False, False, "Asif Afridi"),
    "Awais Zafar":          ("batsman",      "Batsman",      False, False, "Awais Zafar"),
    "Azan Awais":           ("batsman",      "Opener",       False, False, "Azan Awais"),
    "Azhar Ali":            ("batsman",      "Batsman",      False, False, "Azhar Ali"),
    "Babar Azam":           ("batsman",      "Batsman",      True,  False, "Babar Azam"),
    "Faheem Ashraf":        ("all_rounder",  "All-rounder",  False, False, "Faheem Ashraf"),
    "Fawad Alam":           ("batsman",      "Batsman",      False, False, "Fawad Alam"),
    "Haris Rauf":           ("fast_bowler",  "Fast bowler",  False, False, "Haris Rauf"),
    "Haris Sohail":         ("batsman",      "Batsman",      False, False, "Haris Sohail"),
    "Hasan Ali":            ("fast_bowler",  "Fast bowler",  False, False, "Hasan Ali"),
    "Iftikhar Ahmed":       ("all_rounder",  "All-rounder",  False, False, "Iftikhar Ahmed"),
    "Imam-ul-Haq":          ("batsman",      "Opener",       False, False, "Imam-ul-Haq"),
    "Imran Butt":           ("batsman",      "Opener",       False, False, "Imran Butt"),
    "Kamran Ghulam":        ("batsman",      "Batsman",      False, False, "Kamran Ghulam"),
    "Kashif Ali":           ("fast_bowler",  "Fast bowler",  False, False, "Kashif Ali"),
    "Khurram Shahzad":      ("fast_bowler",  "Fast bowler",  False, False, "Khurram Shahzad"),
    "Mir Hamza":            ("fast_bowler",  "Fast bowler",  True,  False, "Mir Hamza"),
    "Mohammad Abbas":       ("fast_bowler",  "Fast bowler",  False, False, "Mohammad Abbas"),
    "Mohammad Ali":         ("fast_bowler",  "Fast bowler",  False, False, "Mohammad Ali"),
    "Mohammad Huraira":     ("batsman",      "Batsman",      False, False, "Mohammad Huraira"),
    "Mohammad Nawaz":       ("all_rounder",  "All-rounder",  False, False, "Mohammad Nawaz"),
    "Mohammad Rizwan":      ("wicketkeeper", "Wicketkeeper", True,  False, "Mohammad Rizwan"),
    "Mohammad Wasim":       ("fast_bowler",  "Fast bowler",  False, False, "Mohammad Wasim"),
    "Naseem Shah":          ("fast_bowler",  "Fast bowler",  True,  False, "Naseem Shah"),
    "Nauman Ali":           ("spinner",      "Spinner",      True,  False, "Noman Ali"),
    "Saim Ayub":            ("batsman",      "Opener",       False, False, "Saim Ayub"),
    "Sajid Khan":           ("spinner",      "Spinner",      True,  False, "Sajid Khan"),
    "Sarfraz Ahmed":        ("wicketkeeper", "Wicketkeeper", False, False, "Sarfraz Ahmed"),
    "Saud Shakeel":         ("batsman",      "Batsman",      True,  False, "Saud Shakeel"),
    "Shaheen Shah Afridi":  ("fast_bowler",  "Fast bowler",  True,  False, "Shaheen Afridi"),
    "Shan Masood":          ("batsman",      "Opener · Captain", True, True, "Shan Masood"),
    "Tabish Khan":          ("fast_bowler",  "Fast bowler",  False, False, "Tabish Khan"),
    "Ubaid Shah":           ("fast_bowler",  "Fast bowler",  False, False, "Ubaid Shah"),
    "Yasir Shah":           ("spinner",      "Spinner",      False, False, "Yasir Shah"),
    "Zafar Gohar":          ("spinner",      "Spinner",      False, False, "Zafar Gohar"),
    "Zahid Mahmood":        ("spinner",      "Spinner",      False, False, "Zahid Mahmood"),
}

DEFAULT_META = ("batsman", "Batsman", False, False)


def get_player_meta(cricsheet_name: str) -> tuple[str, str, bool, bool, str]:
    if cricsheet_name in PLAYERS_META:
        return PLAYERS_META[cricsheet_name]
    role, label, current, captain = DEFAULT_META
    return (role, label, current, captain, cricsheet_name)
