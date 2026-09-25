import { loadFont as loadDisplay } from "@remotion/google-fonts/InterTight";
import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

export const C = {
  ink: "#0B0B0E",
  bone: "#F2EEE6",
  orange: "#FF4A1C",
  blue: "#2B34F5",
  lime: "#D4FF3A",
  pink: "#FF9ED2",
  violet: "#7A5CFF",
};

const displayFont = loadDisplay("normal", { weights: ["500", "800", "900"], subsets: ["latin"] });
const serifFont = loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
const monoFont = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

export const fonts = {
  display: displayFont.fontFamily,
  serif: serifFont.fontFamily,
  mono: monoFont.fontFamily,
};

export const fontsReady = Promise.all([
  displayFont.waitUntilDone(),
  serifFont.waitUntilDone(),
  monoFont.waitUntilDone(),
]);
