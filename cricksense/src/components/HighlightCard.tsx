import { card } from "@/lib/styles";

export default function HighlightCard({ text, tag }: { text: string; tag: string }) {
  return (
    <div style={{ ...card, padding: 15, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 14, lineHeight: 1.45, textWrap: "pretty" }}>{text}</div>
      <div style={{ font: "400 10.5px/1 var(--font-mono)", letterSpacing: "0.08em", color: "oklch(0.60 0.012 100)" }}>
        {tag}
      </div>
    </div>
  );
}
