export const FPS = 60;
export const BPM = 128;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const TOTAL_BEATS = 32;
export const SECONDS_PER_BEAT = 60 / BPM;
export const FRAMES_PER_BEAT = FPS * SECONDS_PER_BEAT;
export const DURATION_IN_FRAMES = Math.round(TOTAL_BEATS * FRAMES_PER_BEAT);

export type Chapter = {
  index: string;
  title: string;
  start: number;
  hud: "light" | "dark";
};

export const CHAPTERS: Chapter[] = [
  { index: "01", title: "PRINCIPLES", start: 0, hud: "light" },
  { index: "02", title: "KINETIC TYPE", start: 4, hud: "dark" },
  { index: "03", title: "GEOMETRY", start: 7.75, hud: "light" },
  { index: "04", title: "FLUIDS", start: 12, hud: "light" },
  { index: "05", title: "THREE DIMENSIONS", start: 16, hud: "light" },
  { index: "06", title: "LAYOUT SYSTEMS", start: 20, hud: "light" },
  { index: "07", title: "PARTICLES", start: 24, hud: "light" },
  { index: "08", title: "SAY HELLO", start: 28, hud: "light" },
];

export const chapterAt = (beat: number) =>
  CHAPTERS.reduce((current, chapter) => (beat >= chapter.start ? chapter : current), CHAPTERS[0]);

export const IMPACTS = [4, 6, 16, 18, 24, 28];
