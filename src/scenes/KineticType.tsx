import { AbsoluteFill } from "remotion";
import { C, fonts } from "../theme";
import { FRAMES_PER_BEAT, WIDTH, HEIGHT } from "../timeline";
import { beatSpring, ease, lerp, progress, useBeat } from "../lib/motion";
import { Smear } from "../lib/Smear";

export const O_CENTER = { x: 1180, y: 705 };
const O_OUTER = 112;
const O_INNER = 54;
const SIZE = 300;
const MOVE_TOP = 555;

export const diveAt = (b: number) => {
  const p = progress(b, 7, 8);
  const pullBack = 1 - 0.07 * Math.sin(Math.PI * progress(b, 7, 7.4));
  const zoom = Math.exp(Math.log(30) * ease.inCubic(p)) * pullBack;
  const travel = ease.inOutCubic(progress(b, 7.1, 7.92));
  return { zoom, x: lerp(O_CENTER.x, WIDTH / 2, travel), y: lerp(O_CENTER.y, HEIGHT / 2, travel), p };
};

const speedOf = (fn: (b: number) => number, b: number) => Math.abs(fn(b) - fn(b - 1 / FRAMES_PER_BEAT));

const typeOn = (text: string, b: number, start: number, perChar = 0.025) =>
  text.slice(0, Math.max(0, Math.floor((b - start) / perChar)));

const letterStyle: React.CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 900,
  fontSize: SIZE,
  lineHeight: 1,
  letterSpacing: "-0.045em",
  color: C.ink,
};

export const KineticType = () => {
  const b = useBeat();
  const dive = diveAt(b);
  const ring = b >= 6.02 ? beatSpring(b, 6.02, 2.3, 0.34) : 0;
  const hole = O_INNER * ring;

  const makeMove = ease.inOutExpo(progress(b, 4.9, 5.32));
  const makeTransform = `translate(${lerp(300, 0, makeMove)}px, ${lerp(215, 0, makeMove)}px) scale(${lerp(1.34, 1, makeMove)})`;

  const itSpring = beatSpring(b, 5.06, 2.1, 0.33);

  const mX = (t: number) => -1400 * (1 - ease.outExpo(progress(t, 6, 6.4)));
  const vY = (t: number) => 800 * (1 - ease.outExpo(progress(t, 6.05, 6.45)));
  const eX = (t: number) => 1100 * (1 - ease.outExpo(progress(t, 6.1, 6.5)));

  const guides = ease.outExpo(progress(b, 4.1, 4.6));
  const holePath = hole > 0.5
    ? ` M${O_CENTER.x + hole},${O_CENTER.y} A${hole},${hole} 0 1 0 ${O_CENTER.x - hole},${O_CENTER.y} A${hole},${hole} 0 1 0 ${O_CENTER.x + hole},${O_CENTER.y} Z`
    : "";

  return (
    <AbsoluteFill
      style={{
        transform: `translate(${dive.x - O_CENTER.x}px, ${dive.y - O_CENTER.y}px) scale(${dive.zoom})`,
        transformOrigin: `${O_CENTER.x}px ${O_CENTER.y}px`,
      }}
    >
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", overflow: "visible" }}>
        <path d={`M-6000,-6000 H8000 V8000 H-6000 Z${holePath}`} fill={C.orange} fillRule="evenodd" />
        {[429, 429 - 0.727 * SIZE, 814, 814 - 0.727 * SIZE].map((y, i) => (
          <line key={i} x1={0} x2={WIDTH * guides} y1={y} y2={y} stroke={C.ink} strokeOpacity={i % 2 === 0 ? 0.35 : 0.14} strokeWidth={1.5} />
        ))}
        {ring > 0 && (
          <circle cx={O_CENTER.x} cy={O_CENTER.y} r={((O_OUTER + O_INNER) / 2) * ring} fill="none" stroke={C.ink} strokeWidth={(O_OUTER - O_INNER) * ring} />
        )}
      </svg>

      <div style={{ position: "absolute", left: 200, top: 170, width: 900, height: SIZE, transform: makeTransform, transformOrigin: "450px 150px", display: "flex", ...letterStyle }}>
        {"MAKE".split("").map((ch, i) => {
          const rise = ease.outExpo(progress(b, 4 + i * 0.07, 4.6 + i * 0.07));
          return (
            <span key={i} style={{ display: "inline-block", clipPath: "inset(-50% -50% 0 -50%)" }}>
              <span style={{ display: "inline-block", transform: `translateY(${(1 - rise) * 105}%)` }}>{ch}</span>
            </span>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 1110,
          top: 60,
          fontFamily: fonts.serif,
          fontStyle: "italic",
          fontSize: 440,
          lineHeight: 1,
          color: C.ink,
          transform: `scale(${itSpring}) rotate(${lerp(-40, -6, itSpring)}deg)`,
          transformOrigin: "30% 70%",
          opacity: b >= 5.06 ? 1 : 0,
        }}
      >
        it
      </div>

      <div style={{ position: "absolute", right: WIDTH - (O_CENTER.x - O_OUTER - 12), top: MOVE_TOP, ...letterStyle, opacity: b >= 6 ? 1 : 0 }}>
        <Smear id="smear-m" x={speedOf(mX, b) * 0.35} style={{ transform: `translateX(${mX(b)}px)` }}>
          M
        </Smear>
      </div>
      <div style={{ position: "absolute", left: O_CENTER.x + O_OUTER + 8, top: MOVE_TOP, display: "flex", ...letterStyle }}>
        <Smear id="smear-v" y={speedOf(vY, b) * 0.35} style={{ transform: `translateY(${vY(b)}px)`, opacity: b >= 6.05 ? 1 : 0 }}>
          V
        </Smear>
        <Smear id="smear-e" x={speedOf(eX, b) * 0.35} style={{ transform: `translateX(${eX(b)}px)`, opacity: b >= 6.1 ? 1 : 0 }}>
          E
        </Smear>
      </div>

      <div
        style={{
          position: "absolute",
          left: 208,
          top: 470,
          fontFamily: fonts.mono,
          fontSize: 15,
          letterSpacing: "0.16em",
          color: C.ink,
          opacity: 0.75,
        }}
      >
        {typeOn("INTER TIGHT BLACK / 300PT / TRACKING -45", b, 4.35, 0.012)}
      </div>
      <div
        style={{
          position: "absolute",
          left: 1160,
          top: 470,
          fontFamily: fonts.mono,
          fontSize: 15,
          letterSpacing: "0.16em",
          color: C.ink,
          opacity: 0.75,
        }}
      >
        {typeOn("INSTRUMENT SERIF ITALIC / 440PT", b, 5.3, 0.012)}
      </div>
    </AbsoluteFill>
  );
};
