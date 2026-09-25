import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, fonts } from "../theme";
import { FRAMES_PER_BEAT, WIDTH, HEIGHT } from "../timeline";
import { beatSpring, ease, lerp, progress } from "../lib/motion";
import { scramble } from "../lib/text";
import { TITLE, TITLE_BASELINE, TITLE_SIZE, TITLE_TRACKING } from "./title";

const TITLE_CENTER_Y = TITLE_BASELINE - TITLE_SIZE * 0.727 * 0.5;
const DISCIPLINES = "MOTION DESIGN  /  KINETIC TYPE  /  3D  /  GENERATIVE  /  UI MOTION";

export const EndCard = () => {
  const frame = useCurrentFrame();
  const b = frame / FRAMES_PER_BEAT;
  const flash = 0.92 * Math.exp(-(b - 28) * 8);
  const punch = lerp(1.1, 1, beatSpring(b, 28, 2.6, 0.38));
  const shock = progress(b, 28, 28.7);
  const rule = ease.outExpo(progress(b, 28.25, 28.9));
  const year = beatSpring(b, 28.3, 2.2, 0.36);
  const pill = beatSpring(b, 28.85, 2.4, 0.5);
  const breathe = 0.5 + 0.5 * Math.cos((b - Math.floor(b)) * Math.PI * 2);

  const exit = ease.inCubic(progress(b, 31.25, 31.5));
  const collapse = ease.inExpo(progress(b, 31.32, 31.68));
  const dot = b < 31.64 ? 0 : 18 * beatSpring(b, 31.64, 3.2, 0.32) * (1 - ease.inCubic(progress(b, 31.84, 31.96)));

  const rows: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    transform: `translateY(${exit * 40}px)`,
    opacity: 1 - exit,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        {shock < 1 && <circle cx={WIDTH / 2} cy={TITLE_CENTER_Y} r={120 + 1500 * ease.outExpo(shock)} fill="none" stroke={C.bone} strokeWidth={40 * (1 - shock)} opacity={1 - shock} />}
        <g
          transform={`translate(${WIDTH / 2} ${TITLE_CENTER_Y}) scale(${punch * lerp(1, 0.012, collapse)} ${punch * lerp(1, 0.07, collapse)}) translate(${-WIDTH / 2} ${-TITLE_CENTER_Y})`}
          opacity={collapse > 0.97 ? 0 : 1}
        >
          <text x={WIDTH / 2 - TITLE_TRACKING / 2} y={TITLE_BASELINE} textAnchor="middle" fontFamily={fonts.display} fontWeight={900} fontSize={TITLE_SIZE} letterSpacing={TITLE_TRACKING} fill={C.bone}>
            {TITLE}
          </text>
        </g>
        <line
          x1={WIDTH / 2 - 660 * rule * (1 - exit)}
          x2={WIDTH / 2 + 660 * rule * (1 - exit)}
          y1={TITLE_BASELINE + 46}
          y2={TITLE_BASELINE + 46}
          stroke={C.bone}
          strokeOpacity={0.4}
          strokeWidth={1.5}
        />
        {dot > 0 && <circle cx={WIDTH / 2} cy={TITLE_CENTER_Y} r={dot} fill={C.bone} />}
      </svg>

      <div
        style={{
          position: "absolute",
          left: WIDTH / 2 + 440,
          top: TITLE_CENTER_Y - 250,
          fontFamily: fonts.serif,
          fontStyle: "italic",
          fontSize: 170,
          lineHeight: 1,
          color: C.orange,
          transform: `scale(${year * (1 - exit)}) rotate(${lerp(-30, -9, year)}deg)`,
          transformOrigin: "20% 80%",
          opacity: b >= 28.3 ? 1 : 0,
        }}
      >
        2026
      </div>

      <div style={{ ...rows, top: TITLE_BASELINE + 82, fontFamily: fonts.mono, fontSize: 25, letterSpacing: "0.22em", color: C.bone, whiteSpace: "pre" }}>
        {scramble(DISCIPLINES, (b - 28.4) * FRAMES_PER_BEAT, frame, 0.45)}
      </div>

      <div style={{ ...rows, top: TITLE_BASELINE + 176 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "18px 34px",
            borderRadius: 999,
            border: `1.5px solid rgba(242, 238, 230, 0.45)`,
            fontFamily: fonts.mono,
            fontSize: 22,
            letterSpacing: "0.2em",
            color: C.bone,
            transform: `translateY(${(1 - pill) * 40}px) scale(${lerp(0.9, 1, pill)})`,
            opacity: Math.min(1, pill * 1.6),
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 12, backgroundColor: C.lime, boxShadow: `0 0 ${8 + 14 * breathe}px ${C.lime}` }} />
          AVAILABLE FOR WORK
        </div>
      </div>

      {b < 28.6 && <AbsoluteFill style={{ backgroundColor: C.bone, opacity: flash }} />}
    </AbsoluteFill>
  );
};
