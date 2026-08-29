import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import { pdfColors as c } from "./theme";

Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { padding: "40 40 32", fontSize: 11, color: c.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottom: `2 solid ${c.ink}`, paddingBottom: 12, marginBottom: 20 },
  eyebrow: { fontSize: 8, letterSpacing: 1.5, color: c.textMuted, textTransform: "uppercase" },
  h1: { fontSize: 24, fontWeight: 700, marginTop: 6 },
  sub: { fontSize: 10, color: c.textMuted, marginTop: 2 },
  metaBlock: { fontSize: 8, color: c.textMuted, textAlign: "right", lineHeight: 1.6 },
  statRow: { flexDirection: "row", borderWidth: 1, borderColor: c.border, marginBottom: 20 },
  statCell: { flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: c.border },
  statLabel: { fontSize: 7.5, letterSpacing: 1, color: c.textMuted, textTransform: "uppercase" },
  statValue: { fontSize: 18, fontWeight: 700, marginTop: 5 },
  sectionTitle: { fontSize: 9, letterSpacing: 1.2, color: c.ink, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 7, marginBottom: 12, textTransform: "uppercase" },
  section: { marginBottom: 20 },
  barRow: { marginBottom: 10 },
  barLabelRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 10, marginBottom: 4 },
  barTrack: { height: 9, backgroundColor: c.bgLight },
  planBox: { borderWidth: 1.5, borderColor: c.ink, padding: 14 },
  planLabel: { fontSize: 8, letterSpacing: 1.2, color: c.ink, marginBottom: 6, textTransform: "uppercase" },
  planBullet: { flexDirection: "row", gap: 6, marginBottom: 4 },
  planBulletMark: { fontSize: 12, lineHeight: 1.4 },
  planText: { fontSize: 12, lineHeight: 1.4, flex: 1 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: c.textMuted },
  dismissalGrid: { flexDirection: "row", gap: 20 },
  dismissalItem: { flex: 1 },
  dismissalPct: { fontSize: 18, fontWeight: 700 },
  dismissalLabel: { fontSize: 9, color: c.textMuted, marginTop: 2 },
});

const BAR_SHADES = [c.barDark, c.barMid, c.barLight];

const PHASE_LABEL: Record<string, string> = {
  overs_1_10: "Overs 1–10",
  overs_11_40: "Overs 11–40",
  overs_40_plus: "Overs 40+",
};

function label(l: string) {
  return PHASE_LABEL[l] ?? l.charAt(0).toUpperCase() + l.slice(1);
}

export type PlayerReportProps = {
  name: string;
  roleLabel: string;
  iccTestRank: number | null;
  statItems: { label: string; value: string }[];
  bars: { label: string; pct: number }[];
  dismissals: { label: string; pct: number }[];
  plan: string[];
  generatedOn: string;
};

export default function PlayerReport({
  name,
  roleLabel,
  iccTestRank,
  statItems,
  bars,
  dismissals,
  plan,
  generatedOn,
}: PlayerReportProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.eyebrow}>CrickSense · Player Report</Text>
            <Text style={s.h1}>{name}</Text>
            <Text style={s.sub}>
              {roleLabel} {iccTestRank ? `· ICC Test rank #${iccTestRank}` : ""}
            </Text>
          </View>
          <Text style={s.metaBlock}>
            COUNTRY: PAKISTAN{"\n"}FORMAT: TEST{"\n"}PERIOD: 2021–2026{"\n"}GENERATED: {generatedOn}
          </Text>
        </View>

        <View style={s.statRow}>
          {statItems.map((item, i) => (
            <View key={item.label} style={i === statItems.length - 1 ? { flex: 1, padding: 12 } : s.statCell}>
              <Text style={s.statLabel}>{item.label.toUpperCase()}</Text>
              <Text style={s.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{bars[0] && bars[0].label in PHASE_LABEL ? "Wickets by innings phase" : "Dismissals by bowler type"}</Text>
          {bars.map((b, i) => (
            <View key={b.label} style={s.barRow}>
              <View style={s.barLabelRow}>
                <Text>{label(b.label)}</Text>
                <Text>{b.pct}%</Text>
              </View>
              <View style={s.barTrack}>
                <View style={{ height: 9, width: `${b.pct}%`, backgroundColor: BAR_SHADES[i % 3] }} />
              </View>
            </View>
          ))}
        </View>

        {dismissals.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Dismissal type</Text>
            <View style={s.dismissalGrid}>
              {dismissals.map((d) => (
                <View key={d.label} style={s.dismissalItem}>
                  <Text style={s.dismissalPct}>{d.pct}%</Text>
                  <Text style={s.dismissalLabel}>{label(d.label)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={s.planBox}>
          <Text style={s.planLabel}>Suggested plan · AI generated</Text>
          {plan.map((bullet, i) => (
            <View key={i} style={s.planBullet}>
              <Text style={s.planBulletMark}>—</Text>
              <Text style={s.planText}>{bullet}</Text>
            </View>
          ))}
        </View>

        <View style={s.footer} fixed>
          <Text>CRICKSENSE · SOURCE: CRICSHEET.ORG BALL-BY-BALL · ICC TEST RANKINGS (WEEKLY REFRESH)</Text>
          <Text render={({ pageNumber, totalPages }) => `PAGE ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
