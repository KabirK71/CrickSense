// Ported from pipeline/bowler_types.py -- keep both in sync if you edit either.
// See that file's docstring for the full rationale (Cricsheet has no bowling-
// style field; this is a manual best-effort pace/spin/swing classification).
// Unrecognised names default to "pace", same as the Python version.

export const BOWLER_TYPES: Record<string, "pace" | "spin" | "swing"> = {
  // --- Pakistan specialists ---
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
  // Pakistan part-time / occasional bowlers (batting specialists)
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

  // --- England ---
  "JM Anderson": "swing",
  "CR Woakes": "swing",
  "OE Robinson": "swing",
  "MJ Potts": "swing",
  "MJ Henry": "swing",
  "MA Wood": "pace",
  "BA Carse": "pace",
  "AAP Atkinson": "pace",
  "BA Stokes": "pace",
  "MJ Leach": "spin",
  "Shoaib Bashir": "spin",
  "Rehan Ahmed": "spin",
  "JE Root": "spin",
  "WG Jacks": "spin",

  // --- Australia ---
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

  // --- New Zealand ---
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

  // --- South Africa ---
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

  // --- Sri Lanka ---
  "CAK Rajitha": "pace",
  "AM Fernando": "pace",
  "MVT Fernando": "pace",
  "D Madushanka": "pace",
  "M Theekshana": "spin",
  "DN Wellalage": "spin",
  "RTM Mendis": "spin",
  "NGRP Jayasuriya": "spin",
  "DM de Silva": "spin",

  // --- West Indies ---
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

  // --- Bangladesh ---
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

  // --- Zimbabwe ---
  "B Muzarabani": "pace",
  "DT Tiripano": "pace",
  "R Ngarava": "pace",
  "LM Jongwe": "pace",
  "M Shumba": "pace",
  "TS Chisoro": "spin",
  "KAR Hodge": "pace",
  "R Kaia": "pace",
  "S Muthusamy": "spin",
};

export function getBowlerType(name: string): "pace" | "spin" | "swing" {
  return BOWLER_TYPES[name] ?? "pace";
}
