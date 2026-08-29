// Ported from pipeline/players_meta.py -- keep both in sync if you edit either.
// See that file's docstring for the full rationale (Cricsheet has no role,
// squad-status, or captaincy field; this is a manually curated snapshot).
// Unrecognised names default to a plain batsman, not in the current squad --
// same fallback as the Python version -- so a debutant shows up immediately
// with sane defaults rather than breaking the pipeline, pending a manual fix.

export type PlayerRole = "batsman" | "wicketkeeper" | "fast_bowler" | "spinner" | "all_rounder";

export type PlayerMeta = {
  role: PlayerRole;
  roleLabel: string;
  isCurrentSquad: boolean;
  isCaptain: boolean;
  displayName: string;
};

const PLAYERS_META: Record<string, [PlayerRole, string, boolean, boolean, string]> = {
  "Aamer Jamal": ["all_rounder", "All-rounder", false, false, "Aamer Jamal"],
  "Abdullah Fazal": ["batsman", "Batsman", false, false, "Abdullah Fazal"],
  "Abdullah Shafique": ["batsman", "Opener", true, false, "Abdullah Shafique"],
  "Abid Ali": ["batsman", "Opener", false, false, "Abid Ali"],
  "Abrar Ahmed": ["spinner", "Spinner", true, false, "Abrar Ahmed"],
  "Agha Salman": ["all_rounder", "All-rounder", true, false, "Salman Agha"],
  "Ali Usman": ["batsman", "Batsman", false, false, "Ali Usman"],
  "Asif Afridi": ["spinner", "Spinner", false, false, "Asif Afridi"],
  "Awais Zafar": ["batsman", "Batsman", false, false, "Awais Zafar"],
  "Azan Awais": ["batsman", "Opener", false, false, "Azan Awais"],
  "Azhar Ali": ["batsman", "Batsman", false, false, "Azhar Ali"],
  "Babar Azam": ["batsman", "Batsman", true, false, "Babar Azam"],
  "Faheem Ashraf": ["all_rounder", "All-rounder", false, false, "Faheem Ashraf"],
  "Fawad Alam": ["batsman", "Batsman", false, false, "Fawad Alam"],
  "Haris Rauf": ["fast_bowler", "Fast bowler", false, false, "Haris Rauf"],
  "Haris Sohail": ["batsman", "Batsman", false, false, "Haris Sohail"],
  "Hasan Ali": ["fast_bowler", "Fast bowler", false, false, "Hasan Ali"],
  "Iftikhar Ahmed": ["all_rounder", "All-rounder", false, false, "Iftikhar Ahmed"],
  "Imam-ul-Haq": ["batsman", "Opener", false, false, "Imam-ul-Haq"],
  "Imran Butt": ["batsman", "Opener", false, false, "Imran Butt"],
  "Kamran Ghulam": ["batsman", "Batsman", false, false, "Kamran Ghulam"],
  "Kashif Ali": ["fast_bowler", "Fast bowler", false, false, "Kashif Ali"],
  "Khurram Shahzad": ["fast_bowler", "Fast bowler", false, false, "Khurram Shahzad"],
  "Mir Hamza": ["fast_bowler", "Fast bowler", true, false, "Mir Hamza"],
  "Mohammad Abbas": ["fast_bowler", "Fast bowler", false, false, "Mohammad Abbas"],
  "Mohammad Ali": ["fast_bowler", "Fast bowler", false, false, "Mohammad Ali"],
  "Mohammad Huraira": ["batsman", "Batsman", false, false, "Mohammad Huraira"],
  "Mohammad Nawaz": ["all_rounder", "All-rounder", false, false, "Mohammad Nawaz"],
  "Mohammad Rizwan": ["wicketkeeper", "Wicketkeeper", true, false, "Mohammad Rizwan"],
  "Mohammad Wasim": ["fast_bowler", "Fast bowler", false, false, "Mohammad Wasim"],
  "Naseem Shah": ["fast_bowler", "Fast bowler", true, false, "Naseem Shah"],
  "Nauman Ali": ["spinner", "Spinner", true, false, "Noman Ali"],
  "Saim Ayub": ["batsman", "Opener", false, false, "Saim Ayub"],
  "Sajid Khan": ["spinner", "Spinner", true, false, "Sajid Khan"],
  "Sarfraz Ahmed": ["wicketkeeper", "Wicketkeeper", false, false, "Sarfraz Ahmed"],
  "Saud Shakeel": ["batsman", "Batsman", true, false, "Saud Shakeel"],
  "Shaheen Shah Afridi": ["fast_bowler", "Fast bowler", true, false, "Shaheen Afridi"],
  "Shan Masood": ["batsman", "Opener · Captain", true, true, "Shan Masood"],
  "Tabish Khan": ["fast_bowler", "Fast bowler", false, false, "Tabish Khan"],
  "Ubaid Shah": ["fast_bowler", "Fast bowler", false, false, "Ubaid Shah"],
  "Yasir Shah": ["spinner", "Spinner", false, false, "Yasir Shah"],
  "Zafar Gohar": ["spinner", "Spinner", false, false, "Zafar Gohar"],
  "Zahid Mahmood": ["spinner", "Spinner", false, false, "Zahid Mahmood"],
};

export function getPlayerMeta(cricsheetName: string): PlayerMeta {
  const entry = PLAYERS_META[cricsheetName];
  if (entry) {
    const [role, roleLabel, isCurrentSquad, isCaptain, displayName] = entry;
    return { role, roleLabel, isCurrentSquad, isCaptain, displayName };
  }
  return { role: "batsman", roleLabel: "Batsman", isCurrentSquad: false, isCaptain: false, displayName: cricsheetName };
}
