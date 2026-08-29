"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { border } from "@/lib/styles";

type SearchOption = {
  viewType: "player" | "filtered" | "suggestion";
  title: string;
  sub: string;
  playerId: number;
  filter?: string | null;
};

type SearchResponse = {
  understood: boolean;
  filterLabel: string | null;
  player: { id: number; name: string } | null;
  options: SearchOption[];
};

const EXAMPLES: SearchOption[] = [
  { viewType: "player", title: "Babar Azam vs spin", sub: "Example query", playerId: -1 },
  { viewType: "player", title: "Shaheen Afridi in overs 1-10", sub: "Example query", playerId: -1 },
  { viewType: "player", title: "Noman Ali wicket types", sub: "Example query", playerId: -1 },
];

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!q.trim()) return;
    const timeout = setTimeout(async () => {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      setResult(await res.json());
    }, 250);
    return () => clearTimeout(timeout);
  }, [q]);

  const activeResult = q.trim() ? result : null;
  const showDrop = focused && q.trim().length > 0;
  const intentLine = activeResult?.understood
    ? `Understood as: player = ${activeResult.player!.name}, filter = ${activeResult.filterLabel ?? "none"}`
    : "No player matched yet — try one of these:";
  const options: SearchOption[] = activeResult?.understood ? activeResult.options : EXAMPLES;

  function pick(opt: SearchOption) {
    setFocused(false);
    if (opt.playerId >= 0) {
      const url = opt.filter ? `/player/${opt.playerId}?filter=${opt.filter}` : `/player/${opt.playerId}`;
      router.push(url);
    } else {
      setQ(opt.title);
    }
  }

  return (
    <div style={{ position: "relative", width: 440, maxWidth: "100%" }} ref={ref}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Ask about a player or match…"
        style={{
          width: "100%",
          padding: "11px 14px 11px 38px",
          borderRadius: 10,
          border: `1px solid oklch(0.87 0.008 100)`,
          background: "oklch(0.98 0.004 100)",
          fontSize: 14,
          color: "oklch(0.24 0.012 100)",
          outline: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 14,
          top: 12,
          width: 14,
          height: 14,
          border: "1.5px solid oklch(0.55 0.01 100)",
          borderRadius: "50%",
        }}
      />
      {showDrop && (
        <div
          style={{
            position: "absolute",
            top: 52,
            left: 0,
            width: "100%",
            background: "#fff",
            border: `1px solid ${border}`,
            borderRadius: 12,
            boxShadow: "0 22px 44px -18px oklch(0.24 0.02 100 / 0.3)",
            overflow: "hidden",
            zIndex: 40,
          }}
        >
          <div
            style={{
              padding: "11px 15px",
              borderBottom: "1px solid oklch(0.93 0.006 100)",
              background: "oklch(0.98 0.004 100)",
              fontSize: 12,
              color: "oklch(0.46 0.012 100)",
            }}
          >
            {intentLine}
          </div>
          {options.map((s, i) => (
            <div
              key={i}
              onClick={() => pick(s)}
              className="hover-row"
              style={{
                padding: "12px 15px",
                display: "flex",
                gap: 12,
                alignItems: "center",
                cursor: "pointer",
                borderBottom: "1px solid oklch(0.95 0.005 100)",
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "oklch(0.95 0.02 158)",
                  color: "oklch(0.40 0.08 158)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: "500 10px/1 var(--font-mono)",
                  flex: "none",
                }}
              >
                {s.playerId >= 0 ? String(i + 1).padStart(2, "0") : "→"}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.title}</div>
                <div style={{ fontSize: 11.5, color: "oklch(0.54 0.012 100)" }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
