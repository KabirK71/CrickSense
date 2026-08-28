// @react-pdf/renderer only understands hex/rgb/named colors, not oklch, so
// these are print-safe grey approximations of the design's PDF template
// palette (CrickSense - standalone.html, section 04 "PDF report template").
export const pdfColors = {
  ink: "#26251f",
  textMuted: "#605f5b",
  textMuted2: "#8c8a85",
  border: "#d6d4cf",
  borderLight: "#e5e3dd",
  bgLight: "#eeece7",
  barDark: "#3a3936",
  barMid: "#8c8a85",
  barLight: "#b7b5af",
};
