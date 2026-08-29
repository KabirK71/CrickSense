"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { border } from "@/lib/styles";

export default function YearFilter({ years }: { years: number[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("year") ?? "all";

  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        router.push(v === "all" ? "/" : `/?year=${v}`);
      }}
      style={{
        border: `1px solid ${border}`,
        borderRadius: 8,
        background: "oklch(0.98 0.004 100)",
        color: "oklch(0.34 0.012 100)",
        font: "500 11px/1 var(--font-mono)",
        padding: "6px 8px",
        cursor: "pointer",
      }}
    >
      <option value="all">All time (2021+)</option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}
