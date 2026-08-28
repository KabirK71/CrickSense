import { card } from "@/lib/styles";

export type StatItem = { label: string; value: string };

export default function PlayerStatsCards({ stats }: { stats: StatItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
      {stats.map((s) => (
        <div key={s.label} style={{ ...card, padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              font: "500 10px/1 var(--font-mono)",
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              color: "oklch(0.54 0.012 100)",
            }}
          >
            {s.label}
          </div>
          <div style={{ fontSize: 29, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
