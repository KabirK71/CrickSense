import type { CSSProperties } from "react";

// Shared style tokens lifted from the design export (CrickSense - standalone.html)
// so every component matches its typography/spacing exactly.

export const label: CSSProperties = {
  font: "500 10.5px/1 var(--font-mono)",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "oklch(0.52 0.01 100)",
};

export const labelSmall: CSSProperties = {
  font: "500 9px/1 var(--font-mono)",
  letterSpacing: "0.1em",
};

export const card: CSSProperties = {
  background: "#fff",
  border: "1px solid oklch(0.89 0.008 100)",
  borderRadius: 12,
};

export const pageBg = "oklch(0.975 0.004 100)";
export const border = "oklch(0.89 0.008 100)";
export const textMuted = "oklch(0.52 0.012 100)";
export const textMuted2 = "oklch(0.54 0.012 100)";
export const brandGreen = "oklch(0.44 0.085 158)";
export const brandGreenDark = "oklch(0.30 0.045 158)";
export const brandGreenTint = "oklch(0.95 0.02 158)";
export const ink = "oklch(0.24 0.012 100)";
