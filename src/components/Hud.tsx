import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, fonts } from "../theme";
import { FPS, FRAMES_PER_BEAT, TOTAL_BEATS, chapterAt } from "../timeline";
import { ease, hash, progress } from "../lib/motion";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+";
const pad = (n: number) => String(n).padStart(2, "0");

const scramble = (text: string, ageFrames: number, frame: number, perChar = 1.2) =>
  text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      if (ageFrames >= i * perChar + 6) return ch;
      if (ageFrames < i * perChar * 0.5) return "";
      return GLYPHS[Math.floor(hash(frame * 13.1 + i * 7.7) * GLYPHS.length)];
    })
    .join("");

export const Hud = () => {
  const frame = useCurrentFrame();
  const b = frame / FRAMES_PER_BEAT;
  const chapter = chapterAt(b);
  const color = chapter.hud === "dark" ? C.ink : C.bone;
  const intro = ease.outExpo(progress(frame, 0, 30));
  const outro = 1 - ease.inCubic(progress(b, 31.25, 31.7));
  const age = (b - chapter.start) * FRAMES_PER_BEAT;
  const seconds = Math.floor(frame / FPS);
  const timecode = `00:00:${pad(seconds)}:${pad(frame % FPS)}`;
  const beatInBar = Math.floor(b) % 4;
  const beatFlash = Math.exp(-(b - Math.floor(b)) * 5);
  const mark = 22 * intro;

  const text: React.CSSProperties = {
    position: "absolute",
    fontFamily: fonts.mono,
    fontSize: 14,
    letterSpacing: "0.16em",
    color,
    whiteSpace: "pre",
  };

  return (
    <AbsoluteFill style={{ opacity: outro, pointerEvents: "none" }}>
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        {[
          [28, 28, 1, 1],
          [1892, 28, -1, 1],
          [28, 1052, 1, -1],
          [1892, 1052, -1, -1],
        ].map(([x, y, dx, dy], i) => (
          <path key={i} d={`M${x + dx * mark},${y} L${x},${y} L${x},${y + dy * mark}`} fill="none" stroke={color} strokeWidth={1.5} />
        ))}
        <line x1={420} x2={1500} y1={1036} y2={1036} stroke={color} strokeOpacity={0.22 * intro} strokeWidth={1} />
        <line x1={420} x2={420 + 1080 * (b / TOTAL_BEATS)} y1={1036} y2={1036} stroke={color} strokeWidth={2} />
        <circle cx={420 + 1080 * (b / TOTAL_BEATS)} cy={1036} r={3.5} fill={color} opacity={intro} />
      </svg>

      <div style={{ ...text, left: 56, top: 44 }}>
        <span style={{ fontWeight: 700 }}>{scramble("SHOWREEL", frame, frame)}</span>
        <span style={{ opacity: 0.55 }}>{scramble(" / MOTION DESIGN / 2026", frame - 6, frame, 0.8)}</span>
      </div>
      <div style={{ ...text, right: 56, top: 44 }}>
        <span style={{ opacity: 0.55 }}>{scramble("TC ", frame - 4, frame)}</span>
        {frame > 8 ? timecode : ""}
        <span style={{ opacity: 0.55 }}>{scramble("  60P", frame - 10, frame)}</span>
      </div>
      <div style={{ ...text, left: 56, top: 1026 }}>
        <span style={{ fontWeight: 700 }}>{chapter.index}</span>
        <span>{"  "}</span>
        <span>{scramble(chapter.title, age, frame)}</span>
      </div>
      <div style={{ ...text, right: 56, top: 1026, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ opacity: 0.55 }}>128 BPM</span>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              width: 9,
              height: 9,
              border: `1.5px solid ${color}`,
              background: color,
              opacity: i === beatInBar ? 0.35 + 0.65 * beatFlash : 0.25,
              transform: `scale(${intro})`,
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
