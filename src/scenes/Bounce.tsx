import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, fonts } from "../theme";
import { FRAMES_PER_BEAT, WIDTH, HEIGHT } from "../timeline";
import { clamp, ease, lerp, mix, progress } from "../lib/motion";

const FLOOR = 780;
const R = 54;
const REST_Y = FLOOR - R;
const CONTACTS = [1, 2, 3];
const CONTACT_X = [600, 810, 960];

type Segment = { from: number; to: number; x0: number; x1: number; height: number; drop?: boolean };

const SEGMENTS: Segment[] = [
  { from: 0, to: 1, x0: 330, x1: 600, height: 880, drop: true },
  { from: 1, to: 2, x0: 600, x1: 810, height: 360 },
  { from: 2, to: 3, x0: 810, x1: 960, height: 190 },
];

const pathAt = (b: number) => {
  if (b >= 3) return { x: 960, y: REST_Y };
  const segment = SEGMENTS.find((s) => b < s.to) ?? SEGMENTS[0];
  const u = clamp((b - segment.from) / (segment.to - segment.from));
  const x = lerp(segment.x0, segment.x1, u);
  const y = segment.drop ? REST_Y - segment.height * (1 - u * u) : REST_Y - 4 * segment.height * u * (1 - u);
  return { x, y };
};

const contactSquash = (b: number) => {
  let q = 0;
  for (const c of CONTACTS) {
    if (c === 3 && b > 3) continue;
    q = Math.max(q, Math.exp(-Math.pow(((b - c) * FRAMES_PER_BEAT) / 2.6, 2)));
  }
  return q;
};

type BallState = { cx: number; cy: number; m: [number, number, number, number]; radius: number; color: string; speed: number; vy: number; q: number };

const ballAt = (b: number): BallState => {
  const epsilon = 0.5 / FRAMES_PER_BEAT;
  const p = pathAt(b);
  const before = pathAt(b - epsilon);
  const after = pathAt(b + epsilon);
  const vx = after.x - before.x;
  const vy = after.y - before.y;
  const speed = Math.hypot(vx, vy);
  const q = contactSquash(b);

  let sy = 1 - 0.4 * q;
  let stretch = 1 + clamp(speed * 0.006, 0, 0.35) * Math.pow(1 - q, 2);
  let theta = Math.atan2(vy, vx);
  let cx = p.x;
  let cy = p.y;
  let growth = 1;

  if (b >= 3) {
    const recover = ease.outCubic(progress(b, 3, 3.1));
    const windUp = ease.inOutCubic(progress(b, 3.12, 3.5));
    sy = 0.6 + 0.22 * recover - 0.32 * windUp;
    stretch = 1;
    theta = 0;
    if (b >= 3.5) {
      const snap = ease.outExpo(progress(b, 3.5, 3.6));
      const relax = ease.inOutCubic(progress(b, 3.6, 3.95));
      sy = lerp(lerp(0.5, 1.8, snap), 1, relax);
      growth = Math.exp(Math.log(32) * ease.inCubic(progress(b, 3.55, 3.97)));
    }
  }

  const sx = 1 / Math.pow(sy, 0.8);
  cy = cy + R * (1 - sy);
  if (b >= 3.5) {
    const rise = ease.inOutCubic(progress(b, 3.5, 3.86));
    cy = lerp(FLOOR - R * sy, HEIGHT / 2, rise);
    cx = lerp(960, WIDTH / 2, rise);
  }

  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const s = stretch;
  const a11 = cos * cos * s + (sin * sin) / s;
  const a12 = cos * sin * (s - 1 / s);
  const a22 = sin * sin * s + (cos * cos) / s;
  const m: [number, number, number, number] = [a11 * sx, a12 * sy, a12 * sx, a22 * sy];

  return {
    cx,
    cy,
    m,
    radius: R * growth,
    color: mix(C.bone, C.orange, progress(b, 3.45, 3.62)),
    speed,
    vy,
    q,
  };
};

const Ball = ({ state, ghost }: { state: BallState; ghost?: number }) => {
  const [a, b, c, d] = state.m;
  return (
    <g transform={`translate(${state.cx} ${state.cy}) matrix(${a} ${c} ${b} ${d} 0 0)`}>
      {ghost === undefined ? (
        <circle r={state.radius} fill={state.color} />
      ) : (
        <circle r={state.radius} fill="none" stroke={C.bone} strokeWidth={1.4} opacity={ghost} />
      )}
    </g>
  );
};

const PRINCIPLES = ["ARCS", "SQUASH & STRETCH", "SLOW IN / SLOW OUT", "ANTICIPATION"];

export const Bounce = () => {
  const frame = useCurrentFrame();
  const b = frame / FRAMES_PER_BEAT;
  const ball = ballAt(b);
  const fadeOut = 1 - progress(b, 3.45, 3.7);
  const floorLength = 1560 * ease.outExpo(progress(frame, 2, 40));

  const trail: { x: number; y: number; age: number }[] = [];
  for (let f = 0; f <= Math.min(frame, 3 * FRAMES_PER_BEAT); f += 2) {
    const p = pathAt(f / FRAMES_PER_BEAT);
    if (p.y > -30) trail.push({ ...p, age: frame - f });
  }

  const ghosts = [1, 2, 3, 4, 5]
    .map((k) => ({ k, t: b - (k * 3) / FRAMES_PER_BEAT }))
    .filter(({ t }) => t > 0.25 && b < 3.05);

  const inFlight = b > 0.3 && b < 3;
  const active = [
    inFlight && ball.q < 0.3,
    ball.q > 0.3 || (b >= 3 && b < 3.12),
    inFlight && ball.q < 0.2 && Math.abs(ball.vy) < 7 && b > 1,
    b >= 3.12 && b < 3.55,
  ];

  const ticks = [];
  for (let x = -780; x <= 780; x += 40) {
    if (Math.abs(x) > floorLength / 2) continue;
    ticks.push(
      <line key={x} x1={960 + x} x2={960 + x} y1={FLOOR + 10} y2={FLOOR + (x % 200 === 0 ? 24 : 16)} stroke={C.bone} strokeOpacity={0.35} strokeWidth={1} />,
    );
  }

  const bursts = b >= 3.5 && b < 3.9
    ? Array.from({ length: 14 }, (_, i) => {
        const t = progress(b, 3.5, 3.8);
        const angle = (i / 14) * Math.PI * 2;
        const r0 = 90 + 260 * ease.outExpo(t);
        const r1 = r0 + 70 * (1 - t);
        return (
          <line
            key={i}
            x1={960 + Math.cos(angle) * r0}
            y1={700 + Math.sin(angle) * r0}
            x2={960 + Math.cos(angle) * r1}
            y2={700 + Math.sin(angle) * r1}
            stroke={C.bone}
            strokeWidth={3}
            strokeLinecap="round"
            opacity={1 - t}
          />
        );
      })
    : null;

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        <g opacity={fadeOut}>
          <line x1={960 - floorLength / 2} x2={960 + floorLength / 2} y1={FLOOR} y2={FLOOR} stroke={C.bone} strokeWidth={2} />
          {ticks}
          {trail.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.6} fill={C.bone} opacity={0.7 * Math.exp(-p.age / 70)} />
          ))}
          {CONTACTS.map((c, i) => {
            const age = (b - c) * FRAMES_PER_BEAT;
            if (age < 0) return null;
            const t = clamp(age / 32);
            const rx = 24 + 150 * ease.outExpo(t);
            const labelIn = ease.outExpo(clamp(age / 14));
            return (
              <g key={c}>
                {t < 1 && <ellipse cx={CONTACT_X[i]} cy={FLOOR} rx={rx} ry={rx * 0.14} fill="none" stroke={C.bone} strokeWidth={2} opacity={1 - t} />}
                <line x1={CONTACT_X[i]} x2={CONTACT_X[i]} y1={FLOOR + 30} y2={FLOOR + 30 + 18 * labelIn} stroke={C.orange} strokeWidth={2} />
                <text x={CONTACT_X[i]} y={FLOOR + 74 - 10 * (1 - labelIn)} fill={C.orange} opacity={labelIn} textAnchor="middle" fontFamily={fonts.mono} fontSize={15} letterSpacing={2}>
                  {`0${i + 1}`}
                </text>
              </g>
            );
          })}
          {ghosts.map(({ k, t }) => (
            <Ball key={k} state={ballAt(t)} ghost={0.55 * (1 - k / 6)} />
          ))}
        </g>
        {bursts}
        <Ball state={ball} />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 900,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 56,
          fontFamily: fonts.mono,
          fontSize: 15,
          letterSpacing: "0.22em",
          color: C.bone,
          opacity: fadeOut * ease.outCubic(progress(frame, 12, 30)),
        }}
      >
        {PRINCIPLES.map((label, i) => (
          <span key={label} style={{ opacity: active[i] ? 1 : 0.28, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 7, height: 7, borderRadius: 7, background: active[i] ? C.orange : "transparent", border: `1px solid ${C.bone}` }} />
            {label}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};
