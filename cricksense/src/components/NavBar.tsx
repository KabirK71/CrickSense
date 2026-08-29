import Link from "next/link";
import CountriesMenu from "./CountriesMenu";
import SearchBar from "./SearchBar";
import { COUNTRY_FLAGS } from "@/lib/country-flags";
import { getTeamBadges } from "@/lib/live-series";

export default async function NavBar() {
  const teamBadges = await getTeamBadges();
  // Prefer the real national flag where we have one; team badges (crests,
  // not flags) only fill in for the handful of cricket "countries" that
  // aren't sovereign ISO nations (England, West Indies).
  const flags = { ...teamBadges, ...COUNTRY_FLAGS };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        padding: "14px 24px",
        borderBottom: "1px solid oklch(0.91 0.008 100)",
        background: "#fff",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <CountriesMenu flags={flags} />
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "oklch(0.44 0.085 158)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              font: "700 12px/1 var(--font-sans)",
              letterSpacing: "0.02em",
            }}
          >
            CS
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "inherit" }}>CrickSense</div>
          <div
            style={{
              font: "500 9.5px/1 var(--font-mono)",
              letterSpacing: "0.1em",
              padding: "4px 7px",
              borderRadius: 5,
              background: "oklch(0.95 0.02 158)",
              color: "oklch(0.38 0.075 158)",
            }}
          >
            PAKISTAN
          </div>
        </Link>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              background: "oklch(0.95 0.02 158)",
              color: "oklch(0.36 0.075 158)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Test
          </div>
          {["T20", "ODI"].map((f) => (
            <div
              key={f}
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                color: "oklch(0.62 0.01 100)",
                fontSize: 13,
                display: "flex",
                gap: 7,
                alignItems: "center",
              }}
            >
              {f}{" "}
              <span
                style={{
                  font: "500 9px/1 var(--font-mono)",
                  letterSpacing: "0.1em",
                  padding: "3px 5px",
                  borderRadius: 4,
                  background: "oklch(0.93 0.006 100)",
                }}
              >
                SOON
              </span>
            </div>
          ))}
        </div>
      </div>
      <SearchBar />
    </div>
  );
}
