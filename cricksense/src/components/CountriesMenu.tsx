"use client";

import { useEffect, useRef, useState } from "react";
import { border, label as labelStyle } from "@/lib/styles";

const COUNTRIES = [
  { name: "Pakistan", live: true },
  { name: "Australia", live: false },
  { name: "India", live: false },
  { name: "England", live: false },
  { name: "South Africa", live: false },
  { name: "Sri Lanka", live: false },
  { name: "New Zealand", live: false },
  { name: "West Indies", live: false },
  { name: "Bangladesh", live: false },
  { name: "Afghanistan", live: false },
  { name: "Zimbabwe", live: false },
  { name: "Ireland", live: false },
];

export default function CountriesMenu({ flags }: { flags: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        aria-label="Countries menu"
        onClick={() => setOpen((v) => !v)}
        className="hover-menu-btn"
        style={{
          width: 36,
          height: 36,
          borderRadius: 9,
          border: `1px solid ${border}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          cursor: "pointer",
          background: "#fff",
        }}
      >
        <span style={{ width: 15, height: 1.5, borderRadius: 2, background: "oklch(0.32 0.012 100)" }} />
        <span style={{ width: 15, height: 1.5, borderRadius: 2, background: "oklch(0.32 0.012 100)" }} />
        <span style={{ width: 15, height: 1.5, borderRadius: 2, background: "oklch(0.32 0.012 100)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 0,
            width: 300,
            background: "#fff",
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: "0 22px 44px -18px oklch(0.24 0.02 100 / 0.32)",
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "13px 15px",
              borderBottom: "1px solid oklch(0.93 0.006 100)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "oklch(0.98 0.004 100)",
            }}
          >
            <span style={labelStyle}>Countries</span>
            <span
              onClick={() => setOpen(false)}
              style={{ fontSize: 15, color: "oklch(0.55 0.012 100)", cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </span>
          </div>
          <div style={{ maxHeight: 396, overflow: "auto" }}>
            {COUNTRIES.map((c) => (
              <div
                key={c.name}
                style={{
                  padding: "12px 15px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid oklch(0.96 0.004 100)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {flags[c.name] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- external, unoptimizable flag CDN
                    <img
                      src={flags[c.name]}
                      alt=""
                      width={18}
                      height={13}
                      style={{ objectFit: "cover", borderRadius: 2, flex: "none" }}
                    />
                  ) : (
                    <span style={{ width: 18, height: 13, flex: "none" }} />
                  )}
                  <span style={{ fontSize: 14, color: c.live ? "oklch(0.24 0.012 100)" : "oklch(0.62 0.012 100)" }}>
                    {c.name}
                  </span>
                </span>
                {c.live ? (
                  <span
                    style={{
                      font: "500 9px/1 var(--font-mono)",
                      letterSpacing: "0.1em",
                      padding: "4px 6px",
                      borderRadius: 4,
                      background: "oklch(0.44 0.085 158)",
                      color: "#fff",
                    }}
                  >
                    SELECTED
                  </span>
                ) : (
                  <span
                    style={{
                      font: "500 9px/1 var(--font-mono)",
                      letterSpacing: "0.1em",
                      padding: "4px 6px",
                      borderRadius: 4,
                      background: "oklch(0.94 0.005 100)",
                      color: "oklch(0.58 0.012 100)",
                    }}
                  >
                    SOON
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: "12px 15px",
              fontSize: 11.5,
              lineHeight: 1.45,
              color: "oklch(0.56 0.012 100)",
              background: "oklch(0.98 0.004 100)",
            }}
          >
            V1 covers Pakistan Tests from 2021. Other countries switch on as their data is loaded.
          </div>
        </div>
      )}
    </div>
  );
}
