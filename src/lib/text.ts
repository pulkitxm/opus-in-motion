import { hash } from "./motion";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+";

export const scramble = (text: string, ageFrames: number, frame: number, perChar = 1.2) =>
  text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (ageFrames >= i * perChar + 6) return ch;
      if (ageFrames < i * perChar * 0.5) return "";
      return GLYPHS[Math.floor(hash(frame * 13.1 + i * 7.7) * GLYPHS.length)];
    })
    .join("");
