export type BarItem = { label: string; pct: number };

const PHASE_DISPLAY: Record<string, string> = {
  overs_1_10: "Overs 1–10",
  overs_11_40: "Overs 11–40",
  overs_40_plus: "Overs 40+",
};

function displayLabel(label: string) {
  if (label in PHASE_DISPLAY) return PHASE_DISPLAY[label];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function DismissalBars({ bars, palette }: { bars: BarItem[]; palette: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {bars.map((b, i) => (
        <div key={b.label}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{displayLabel(b.label)}</span>
            <span style={{ fontSize: 14, fontVariantNumeric: "tabular-nums", color: "oklch(0.42 0.012 100)" }}>
              {b.pct}%
            </span>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "oklch(0.93 0.006 100)", overflow: "hidden" }}>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: palette[i % palette.length],
                width: `${b.pct}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DismissalTypeGrid({ items }: { items: BarItem[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(items.length, 1)}, 1fr)`, gap: 12 }}>
      {items.map((d) => (
        <div
          key={d.label}
          style={{
            background: "#fff",
            border: "1px solid oklch(0.89 0.008 100)",
            borderRadius: 12,
            padding: 18,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}>
            {d.pct}%
          </div>
          <div style={{ fontSize: 13, color: "oklch(0.52 0.012 100)", marginTop: 4 }}>{displayLabel(d.label)}</div>
        </div>
      ))}
    </div>
  );
}
