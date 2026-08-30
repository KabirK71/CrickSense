import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import PlayerStatsCards, { type StatItem } from "@/components/PlayerStatsCards";
import DismissalBars, { DismissalTypeGrid } from "@/components/DismissalBars";
import {
  getBattingStats,
  getBowlingStats,
  getCurrentSquad,
  getDismissalTypeBreakdown,
  getDismissalsByBowlerType,
  getPlayerById,
  getWicketsByPhase,
  initials,
  isBattingRole,
  isBowlingRole,
} from "@/db/queries";
import { generateSuggestion } from "@/lib/suggestion";
import { FILTER_LABELS } from "@/lib/search";
import { CLAY, GREEN } from "@/lib/colors";
import { card, pageBg } from "@/lib/styles";

export default async function PlayerPage({ params, searchParams }: PageProps<"/player/[id]">) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) notFound();

  const { filter: filterParam } = await searchParams;
  const filter = Array.isArray(filterParam) ? filterParam[0] : (filterParam ?? null);
  const filterLabel = filter ? (FILTER_LABELS[filter] ?? filter) : null;

  const player = await getPlayerById(playerId);
  if (!player) notFound();

  // All-rounders are both, so this isn't an either/or -- an all-rounder's
  // page shows both stat blocks, both bar charts, everything a specialist
  // in either discipline would get.
  const showBatting = isBattingRole(player.role);
  const showBowling = isBowlingRole(player.role);
  const bothShown = showBatting && showBowling;

  const [battingStats, bowlingStats, dismissalBars, phaseBars, dismissals, plan, squad] = await Promise.all([
    showBatting ? getBattingStats(playerId) : Promise.resolve(null),
    showBowling ? getBowlingStats(playerId) : Promise.resolve(null),
    showBatting ? getDismissalsByBowlerType(playerId) : Promise.resolve([]),
    showBowling ? getWicketsByPhase(playerId) : Promise.resolve([]),
    showBatting ? getDismissalTypeBreakdown(playerId) : Promise.resolve([]),
    generateSuggestion(player, filter),
    getCurrentSquad(),
  ]);

  // Backfilled by the daily refresh-live-status cron for squad players
  // missing this data (see refresh-live-status.ts), never fetched live here.
  const hasBioData = player.dateOfBirth || player.placeOfBirth || player.battingStyle || player.bowlingStyleText;
  const bio = hasBioData
    ? {
        dateOfBirth: player.dateOfBirth,
        placeOfBirth: player.placeOfBirth,
        battingStyle: player.battingStyle,
        bowlingStyle: player.bowlingStyleText,
        photoUrl: player.photoUrl,
      }
    : null;

  const iccRankValue = player.iccTestRank ? `#${player.iccTestRank}` : "Unranked";

  const battingItems: StatItem[] | null = battingStats
    ? [
        { label: "Runs since 2021", value: battingStats.runs.toLocaleString() },
        { label: "Average", value: String(battingStats.average) },
        { label: "ICC Test rank", value: iccRankValue },
        { label: "Strike rate", value: String(battingStats.strikeRate) },
      ]
    : null;

  const bowlingItems: StatItem[] | null = bowlingStats
    ? [
        { label: "Wickets since 2021", value: String(bowlingStats.wickets) },
        { label: "Bowling average", value: String(bowlingStats.average) },
        // Already shown in the batting cards for an all-rounder -- no need twice.
        ...(bothShown ? [] : [{ label: "ICC Test rank", value: iccRankValue }]),
        { label: "Economy", value: String(bowlingStats.economy) },
      ]
    : null;

  const related = squad.filter((p) => p.id !== player.id && isBattingRole(p.role) === showBatting).slice(0, 3);

  return (
    <div>
      <NavBar />
      <div style={{ background: pageBg, padding: 26, minHeight: "calc(100vh - 68px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 1280, margin: "0 auto" }}>
          <Link
            href="/"
            className="hover-link"
            style={{
              font: "500 11px/1 var(--font-mono)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "oklch(0.50 0.012 100)",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            ← Dashboard
          </Link>

          <div
            style={{
              ...card,
              borderRadius: 14,
              padding: "22px 24px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                flex: "none",
                background:
                  "repeating-linear-gradient(135deg, oklch(0.92 0.008 100) 0 5px, oklch(0.955 0.005 100) 5px 10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "500 15px/1 var(--font-mono)",
                color: "oklch(0.52 0.012 100)",
              }}
            >
              {initials(player.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
                {player.name}
              </div>
              <div style={{ fontSize: 14.5, color: "oklch(0.50 0.012 100)", marginTop: 3 }}>{player.roleLabel}</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flex: "none", flexWrap: "wrap" }}>
              <div
                style={{
                  padding: "9px 14px",
                  borderRadius: 999,
                  background: "oklch(0.95 0.02 158)",
                  color: "oklch(0.36 0.075 158)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ICC Test rank {player.iccTestRank ? `#${player.iccTestRank}` : "—"}
              </div>
              <a
                href={`/api/pdf/player-${player.id}`}
                className="hover-dark-btn"
                style={{
                  padding: "11px 16px",
                  borderRadius: 9,
                  background: "oklch(0.24 0.012 100)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Download PDF report
              </a>
            </div>
          </div>

          <div className="page-columns" style={{ alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
              {battingItems && (
                <>
                  {bothShown && <DisciplineLabel>Batting</DisciplineLabel>}
                  <PlayerStatsCards stats={battingItems} />
                </>
              )}
              {bowlingItems && (
                <>
                  {bothShown && <DisciplineLabel>Bowling</DisciplineLabel>}
                  <PlayerStatsCards stats={bowlingItems} />
                </>
              )}

              {showBatting && (
                <div style={{ ...card, borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <div
                      style={{
                        font: "500 10.5px/1 var(--font-mono)",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "oklch(0.52 0.01 100)",
                      }}
                    >
                      Dismissals by bowler type
                    </div>
                    <div style={{ fontSize: 12, color: "oklch(0.58 0.012 100)" }}>Share of dismissals, 2021–2026</div>
                  </div>
                  <DismissalBars bars={dismissalBars} palette={CLAY} />
                  <div
                    style={{
                      fontSize: 12,
                      color: "oklch(0.58 0.012 100)",
                      borderTop: "1px solid oklch(0.94 0.005 100)",
                      paddingTop: 14,
                      lineHeight: 1.45,
                    }}
                  >
                    Weakness is measured on available ball-by-ball fields — dismissal type, bowler type and innings
                    phase.
                  </div>
                </div>
              )}

              {showBowling && (
                <div style={{ ...card, borderRadius: 14, padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <div
                      style={{
                        font: "500 10.5px/1 var(--font-mono)",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "oklch(0.52 0.01 100)",
                      }}
                    >
                      Wickets by innings phase
                    </div>
                    <div style={{ fontSize: 12, color: "oklch(0.58 0.012 100)" }}>Share of wickets, 2021–2026</div>
                  </div>
                  <DismissalBars bars={phaseBars} palette={GREEN} />
                  <div
                    style={{
                      fontSize: 12,
                      color: "oklch(0.58 0.012 100)",
                      borderTop: "1px solid oklch(0.94 0.005 100)",
                      paddingTop: 14,
                      lineHeight: 1.45,
                    }}
                  >
                    Weakness is measured on available ball-by-ball fields — dismissal type, bowler type and innings
                    phase.
                  </div>
                </div>
              )}

              {showBatting && dismissals.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div
                    style={{
                      font: "500 10.5px/1 var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "oklch(0.52 0.01 100)",
                    }}
                  >
                    Dismissal type
                  </div>
                  <DismissalTypeGrid items={dismissals} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div
                style={{
                  border: "1px solid oklch(0.44 0.085 158)",
                  borderRadius: 14,
                  padding: 20,
                  background: "oklch(0.975 0.012 158)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      font: "500 10.5px/1 var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "oklch(0.40 0.08 158)",
                    }}
                  >
                    {filterLabel ? `Suggested plan vs ${filterLabel}` : "Suggested plan"}
                  </div>
                  <div
                    style={{
                      font: "500 9px/1 var(--font-mono)",
                      letterSpacing: "0.1em",
                      padding: "4px 6px",
                      borderRadius: 4,
                      background: "oklch(0.44 0.085 158)",
                      color: "#fff",
                    }}
                  >
                    AI
                  </div>
                </div>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {plan.map((bullet, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 15,
                        lineHeight: 1.45,
                        letterSpacing: "-0.01em",
                        color: "oklch(0.26 0.03 158)",
                      }}
                    >
                      <span style={{ color: "oklch(0.44 0.085 158)", flex: "none" }}>—</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ fontSize: 11.5, color: "oklch(0.48 0.04 158)", lineHeight: 1.4 }}>
                  {filterLabel
                    ? `Scoped to dismissals involving ${filterLabel}. Clear the filter for this player's overall plan.`
                    : "Generated from this player's dismissal and phase splits."}
                </div>
                {filterLabel && (
                  <Link
                    href={`/player/${player.id}`}
                    className="hover-link"
                    style={{
                      font: "500 10.5px/1 var(--font-mono)",
                      letterSpacing: "0.06em",
                      color: "oklch(0.40 0.08 158)",
                    }}
                  >
                    ← Clear filter
                  </Link>
                )}
              </div>

              {bio && (
                <div style={{ ...card, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div
                    style={{
                      font: "500 10.5px/1 var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "oklch(0.52 0.01 100)",
                    }}
                  >
                    Player bio
                  </div>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {bio.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- external, unoptimizable photo CDN
                      <img
                        src={bio.photoUrl}
                        alt={player.name}
                        width={56}
                        height={56}
                        style={{ borderRadius: "50%", objectFit: "cover", flex: "none" }}
                      />
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                      {bio.dateOfBirth && (
                        <Row
                          label="Born"
                          value={new Date(bio.dateOfBirth).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        />
                      )}
                      {bio.placeOfBirth && <Row label="Birthplace" value={bio.placeOfBirth} />}
                      {bio.battingStyle && <Row label="Batting style" value={bio.battingStyle} />}
                      {bio.bowlingStyle && <Row label="Bowling style" value={bio.bowlingStyle} />}
                    </div>
                  </div>
                  <div
                    style={{
                      borderTop: "1px solid oklch(0.94 0.005 100)",
                      paddingTop: 13,
                      font: "400 11px/1.5 var(--font-mono)",
                      color: "oklch(0.58 0.012 100)",
                    }}
                  >
                    SOURCE: CRICAPI · BIOGRAPHICAL DATA ONLY
                  </div>
                </div>
              )}

              <div style={{ ...card, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div
                  style={{
                    font: "500 10.5px/1 var(--font-mono)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "oklch(0.52 0.01 100)",
                  }}
                >
                  Data coverage
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {battingStats && (
                    <>
                      <Row label={bothShown ? "Batting innings" : "Innings"} value={String(battingStats.innings)} />
                      <Row label="Balls faced" value={battingStats.ballsFaced.toLocaleString()} />
                    </>
                  )}
                  {bowlingStats && (
                    <>
                      <Row label={bothShown ? "Bowling innings" : "Innings"} value={String(bowlingStats.innings)} />
                      <Row label="Balls bowled" value={bowlingStats.ballsBowled.toLocaleString()} />
                    </>
                  )}
                  <Row label="Period" value="2021–2026" />
                </div>
                <div
                  style={{
                    borderTop: "1px solid oklch(0.94 0.005 100)",
                    paddingTop: 13,
                    font: "400 11px/1.5 var(--font-mono)",
                    color: "oklch(0.58 0.012 100)",
                  }}
                >
                  ICC RANK: WEEKLY REFRESH
                </div>
              </div>

              {related.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div
                    style={{
                      font: "500 10.5px/1 var(--font-mono)",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "oklch(0.52 0.01 100)",
                    }}
                  >
                    Compare with
                  </div>
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/player/${r.id}`}
                      className="hover-border"
                      style={{
                        background: "#fff",
                        border: "1px solid oklch(0.89 0.008 100)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "inherit",
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</span>
                      <span style={{ fontSize: 12, color: "oklch(0.54 0.012 100)" }}>{r.roleLabel}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ color: "oklch(0.50 0.012 100)" }}>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

// Only shown for all-rounders, who get both a batting and a bowling stat
// block -- specialists just get the one, unlabeled, as before.
function DisciplineLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        font: "500 10.5px/1 var(--font-mono)",
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "oklch(0.52 0.01 100)",
      }}
    >
      {children}
    </div>
  );
}
