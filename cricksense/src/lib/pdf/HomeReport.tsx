import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { pdfColors as c } from "./theme";

const s = StyleSheet.create({
  page: { padding: "40 40 32", fontSize: 11, color: c.ink, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", borderBottom: `2 solid ${c.ink}`, paddingBottom: 12, marginBottom: 20 },
  eyebrow: { fontSize: 8, letterSpacing: 1.5, color: c.textMuted, textTransform: "uppercase" },
  h1: { fontSize: 22, fontWeight: 700, marginTop: 6 },
  sub: { fontSize: 10, color: c.textMuted, marginTop: 2 },
  metaBlock: { fontSize: 8, color: c.textMuted, textAlign: "right", lineHeight: 1.6 },
  sectionTitle: { fontSize: 9, letterSpacing: 1.2, color: c.ink, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 7, marginBottom: 12, textTransform: "uppercase" },
  section: { marginBottom: 20 },
  grid2: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: { width: "48%", borderWidth: 1, borderColor: c.border, padding: 12 },
  cellLabel: { fontSize: 8, color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  cellName: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  cellDetail: { fontSize: 9.5, color: c.textMuted, marginTop: 3 },
  highlight: { borderWidth: 1, borderColor: c.borderLight, padding: 12, marginBottom: 8 },
  highlightText: { fontSize: 10.5, lineHeight: 1.4 },
  highlightTag: { fontSize: 7.5, color: c.textMuted2, marginTop: 5, letterSpacing: 0.8 },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: c.textMuted },
});

export type HomeReportProps = {
  opponent: string;
  result: string | null;
  venue: string | null;
  performers: { label: string; name: string; detail: string }[];
  highlights: { text: string; tag: string }[];
  generatedOn: string;
};

export default function HomeReport({ opponent, result, venue, performers, highlights, generatedOn }: HomeReportProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.eyebrow}>CrickSense · Dashboard Report</Text>
            <Text style={s.h1}>Pakistan vs {opponent}</Text>
            <Text style={s.sub}>{[venue, result].filter(Boolean).join(" · ")}</Text>
          </View>
          <Text style={s.metaBlock}>
            COUNTRY: PAKISTAN{"\n"}FORMAT: TEST{"\n"}GENERATED: {generatedOn}
          </Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Top / bottom performers</Text>
          <View style={s.grid2}>
            {performers.map((p) => (
              <View key={p.label} style={s.cell}>
                <Text style={s.cellLabel}>{p.label}</Text>
                <Text style={s.cellName}>{p.name}</Text>
                <Text style={s.cellDetail}>{p.detail}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Highlights</Text>
          {highlights.map((h, i) => (
            <View key={i} style={s.highlight}>
              <Text style={s.highlightText}>{h.text}</Text>
              <Text style={s.highlightTag}>{h.tag}</Text>
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
