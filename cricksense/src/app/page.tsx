import NavBar from "@/components/NavBar";
import SquadGrid from "@/components/SquadGrid";
import HighlightCard from "@/components/HighlightCard";
import { getCurrentSquad, getLatestMatch, getPerformers, initials } from "@/db/queries";
import { getHighlights } from "@/lib/highlights";
import { card, pageBg } from "@/lib/styles";

// Squad, performers, and highlights change as new match data / ICC ranks
// come in via the pipeline and weekly cron -- never statically cache this.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [squad, match, performers, highlights] = await Promise.all([
    getCurrentSquad(),
    getLatestMatch(),
    getPerformers(),
    getHighlights(),
  ]);

  const squadForGrid = squad.map((p) => ({
    id: p.id,
    name: p.name,
    roleLabel: p.roleLabel,
    initials: initials(p.name),
    iccTestRank: p.iccTestRank,
  }));

  return (
    <div>
      <NavBar />
      <div style={{ background: pageBg, padding: 26, minHeight: "calc(100vh - 68px)" }}>
        <div
          className="page-columns"
          style={{
            alignItems: "start",
            maxWidth: 1280,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
            {match && (
              <div
                style={{
                  background: "oklch(0.30 0.045 158)",
                  borderRadius: 14,
                  padding: "22px 24px",
                  color: "oklch(0.97 0.01 158)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ font: "500 10px/1 var(--font-mono)", letterSpacing: "0.18em", color: "oklch(0.78 0.05 158)" }}>
                    MOST RECENT TEST
                  </div>
                  <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-0.02em" }}>
                    Pakistan vs {match.opponent}
                  </div>
                  <div style={{ fontSize: 14, color: "oklch(0.84 0.03 158)" }}>
                    {match.venue} · {new Date(match.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>{match.result}</div>
                  <div style={{ fontSize: 13, color: "oklch(0.84 0.03 158)" }}>Post-match analysis</div>
                </div>
              </div>
            )}

            <SquadGrid squad={squadForGrid} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  font: "500 10.5px/1 var(--font-mono)",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "oklch(0.52 0.01 100)",
                }}
              >
                Top / bottom performers
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {performers.mostRuns && (
                  <PerformerCard
                    label="Most runs"
                    name={performers.mostRuns.player.name}
                    detail={`${performers.mostRuns.runs.toLocaleString()} runs · ${performers.mostRuns.average} avg`}
                  />
                )}
                {performers.mostWickets && (
                  <PerformerCard
                    label="Most wickets"
                    name={performers.mostWickets.player.name}
                    detail={`${performers.mostWickets.wickets} wkts · ${performers.mostWickets.average} avg`}
                  />
                )}
                {performers.bestStrikeRate && (
                  <PerformerCard
                    label="Best strike rate"
                    name={performers.bestStrikeRate.player.name}
                    detail={`${performers.bestStrikeRate.strikeRate} SR · ${performers.bestStrikeRate.average} avg`}
                  />
                )}
                {performers.needsAttention && (
                  <PerformerCard
                    label="Needs attention"
                    name={performers.needsAttention.player.name}
                    detail={performers.needsAttention.label}
                    warn
                  />
                )}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div
                  style={{
                    font: "500 10.5px/1 var(--font-mono)",
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "oklch(0.52 0.01 100)",
                  }}
                >
                  Highlights
                </div>
                <div
                  style={{
                    font: "500 9px/1 var(--font-mono)",
                    letterSpacing: "0.1em",
                    padding: "4px 6px",
                    borderRadius: 4,
                    background: "oklch(0.95 0.02 158)",
                    color: "oklch(0.40 0.08 158)",
                  }}
                >
                  AUTO
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {highlights.map((h, i) => (
                  <HighlightCard key={i} text={h.text} tag={h.tag} />
                ))}
              </div>
            </div>

            {/* File download from an API route, not a page -- next/link doesn't apply here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/pdf/home"
              style={{
                border: "1px dashed oklch(0.84 0.01 100)",
                borderRadius: 12,
                padding: 15,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                color: "inherit",
              }}
            >
              <div style={{ fontSize: 12.5, color: "oklch(0.50 0.012 100)", lineHeight: 1.4 }}>
                Export this dashboard as a one-page report.
              </div>
              <div
                className="hover-dark-btn"
                style={{
                  padding: "9px 14px",
                  borderRadius: 9,
                  background: "oklch(0.24 0.012 100)",
                  color: "#fff",
                  fontSize: 12.5,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Download PDF
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function PerformerCard({ label, name, detail, warn }: { label: string; name: string; detail: string; warn?: boolean }) {
  return (
    <div style={{ ...card, padding: 15, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 11.5, color: "oklch(0.54 0.012 100)" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{name}</div>
      <div
        style={{
          fontSize: 13,
          color: warn ? "oklch(0.54 0.10 50)" : "oklch(0.44 0.085 158)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {detail}
      </div>
    </div>
  );
}
