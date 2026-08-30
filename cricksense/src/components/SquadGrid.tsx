import Link from "next/link";
import { border } from "@/lib/styles";

export type SquadPlayer = {
  id: number;
  name: string;
  roleLabel: string;
  initials: string;
  iccTestRank: number | null;
};

export default function SquadGrid({ squad }: { squad: SquadPlayer[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div
          style={{
            font: "500 10.5px/1 var(--font-mono)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "oklch(0.52 0.01 100)",
          }}
        >
          Squad — {squad.length} players
        </div>
        <div style={{ fontSize: 12, color: "oklch(0.56 0.012 100)" }}>Click a player for the full breakdown</div>
      </div>
      <div className="squad-grid">
        {squad.map((p) => (
          <Link
            key={p.id}
            href={`/player/${p.id}`}
            className="hover-card"
            style={{
              background: "#fff",
              border: `1px solid ${border}`,
              borderRadius: 12,
              padding: 14,
              display: "flex",
              gap: 13,
              alignItems: "center",
              cursor: "pointer",
              color: "inherit",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                flex: "none",
                background:
                  "repeating-linear-gradient(135deg, oklch(0.92 0.008 100) 0 4px, oklch(0.955 0.005 100) 4px 8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "500 12px/1 var(--font-mono)",
                color: "oklch(0.52 0.012 100)",
              }}
            >
              {p.initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.name}
              </div>
              <div style={{ fontSize: 12, color: "oklch(0.54 0.012 100)" }}>{p.roleLabel}</div>
            </div>
            <div style={{ font: "500 10px/1 var(--font-mono)", color: "oklch(0.58 0.012 100)", flex: "none" }}>
              {p.iccTestRank ? `#${p.iccTestRank}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
