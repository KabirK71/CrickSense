"""
Bowler style lookup: pace / spin / swing.

Cricsheet's ball-by-ball data has no notion of bowling style at all (that's a
stylistic label, not something tracked per delivery), so this table is a
manual, best-effort classification based on each bowler's known real-world
role, keyed by the exact name string Cricsheet uses for them. It only needs
to cover bowlers who appear in Pakistan's Test matches from 2021 onwards.

"Swing" and "pace" are not a rigorous technical distinction (most swing
bowlers are also just pace bowlers who swing it) -- this reflects the V1
requirement of a simple three-way split, not a scientific classification.
Flagged for human review in NEEDS_YOUR_INPUT.md: verify/correct entries for
part-time bowlers (specialist batters who occasionally bowl), where the
classification is at its least confident.

Unrecognised names default to "pace" in load_to_neon.py.
"""

BOWLER_TYPES: dict[str, str] = {
    # --- Pakistan specialists ---
    "Shaheen Shah Afridi": "swing",
    "Naseem Shah": "pace",
    "Hasan Ali": "swing",
    "Mir Hamza": "pace",
    "Mohammad Abbas": "swing",
    "Mohammad Ali": "pace",
    "Mohammad Wasim": "pace",
    "Khurram Shahzad": "pace",
    "Haris Rauf": "pace",
    "Faheem Ashraf": "swing",
    "Tabish Khan": "pace",
    "Ubaid Shah": "pace",
    "Kashif Ali": "pace",
    "Nauman Ali": "spin",
    "Sajid Khan": "spin",
    "Abrar Ahmed": "spin",
    "Zahid Mahmood": "spin",
    "Yasir Shah": "spin",
    "Zafar Gohar": "spin",
    "Mohammad Nawaz": "spin",
    "Asif Afridi": "spin",
    # Pakistan part-time / occasional bowlers (batting specialists)
    "Azhar Ali": "spin",
    "Agha Salman": "spin",
    "Babar Azam": "spin",
    "Haris Sohail": "spin",
    "Iftikhar Ahmed": "spin",
    "Saim Ayub": "spin",
    "Shan Masood": "spin",
    "Saud Shakeel": "spin",
    "Imam-ul-Haq": "pace",
    "Fawad Alam": "spin",
    "Kamran Ghulam": "pace",

    # --- England ---
    "JM Anderson": "swing",
    "CR Woakes": "swing",
    "OE Robinson": "swing",
    "MJ Potts": "swing",
    "MJ Henry": "swing",  # NZ, listed here defensively in case of dupes
    "MA Wood": "pace",
    "BA Carse": "pace",
    "AAP Atkinson": "pace",
    "BA Stokes": "pace",
    "MJ Leach": "spin",
    "Shoaib Bashir": "spin",
    "Rehan Ahmed": "spin",
    "JE Root": "spin",
    "WG Jacks": "spin",

    # --- Australia ---
    "PJ Cummins": "pace",
    "JR Hazlewood": "pace",
    "MA Starc": "swing",
    "C Green": "pace",
    "MR Marsh": "pace",
    "NM Lyon": "spin",
    "MJ Swepson": "spin",
    "SPD Smith": "spin",
    "TM Head": "spin",
    "M Labuschagne": "spin",

    # --- New Zealand ---
    "TA Boult": "swing",
    "TG Southee": "swing",
    "KA Jamieson": "pace",
    "N Wagner": "pace",
    "DJ Mitchell": "pace",
    "MG Bracewell": "spin",
    "IS Sodhi": "spin",
    "AY Patel": "spin",
    "KS Williamson": "spin",
    "K Sinclair": "spin",

    # --- South Africa ---
    "K Rabada": "pace",
    "A Nortje": "pace",
    "L Ngidi": "pace",
    "M Jansen": "pace",
    "D Paterson": "pace",
    "C Bosch": "pace",
    "PWA Mulder": "pace",
    "KT Maphaka": "pace",
    "KA Maharaj": "spin",
    "SR Harmer": "spin",
    "GF Linde": "spin",
    "P Subrayen": "spin",
    "AK Markram": "spin",
    "D Elgar": "spin",

    # --- Sri Lanka ---
    "CAK Rajitha": "pace",
    "AM Fernando": "pace",
    "MVT Fernando": "pace",
    "D Madushanka": "pace",
    "M Theekshana": "spin",
    "DN Wellalage": "spin",
    "RTM Mendis": "spin",
    "NGRP Jayasuriya": "spin",
    "DM de Silva": "spin",

    # --- West Indies ---
    "AS Joseph": "pace",
    "S Joseph": "pace",
    "KAJ Roach": "pace",
    "JO Holder": "pace",
    "JNT Seales": "pace",
    "KR Mayers": "pace",
    "JA Warrican": "spin",
    "RL Chase": "spin",
    "KC Brathwaite": "spin",
    "NE Bonner": "spin",
    "JP Greaves": "spin",

    # --- Bangladesh ---
    "Taskin Ahmed": "pace",
    "Ebadat Hossain": "pace",
    "Hasan Mahmud": "pace",
    "Shoriful Islam": "pace",
    "Khaled Ahmed": "pace",
    "Nahid Rana": "pace",
    "Abu Jayed": "pace",
    "Taijul Islam": "spin",
    "Mehedi Hasan Miraz": "spin",
    "Shakib Al Hasan": "spin",
    "Mominul Haque": "spin",

    # --- Zimbabwe ---
    "B Muzarabani": "pace",
    "DT Tiripano": "pace",
    "R Ngarava": "pace",
    "LM Jongwe": "pace",
    "M Shumba": "pace",
    "TS Chisoro": "spin",
    "KAR Hodge": "pace",
    "R Kaia": "pace",
    "S Muthusamy": "spin",
}


def get_bowler_type(name: str) -> str:
    return BOWLER_TYPES.get(name, "pace")
