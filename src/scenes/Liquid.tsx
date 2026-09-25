import { AbsoluteFill } from "remotion";
import { noise2D } from "@remotion/noise";
import { C } from "../theme";
import { WIDTH, HEIGHT } from "../timeline";
import { ease, hash, lerp, mix, progress, pulse, useBeat } from "../lib/motion";
import { COLS, ROWS, TILE, CIRCLE_D } from "./Grid";

export const SPHERE_RADIUS = 262;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const ATTRACTORS = [
  [430, 330],
  [1490, 300],
  [960, 560],
  [470, 810],
  [1470, 800],
];

const phyllo = (index: number, spacing: number, twist: number) => {
  const r = Math.sqrt(index + 0.5) * spacing;
  const a = index * GOLDEN + twist;
  return [Math.cos(a) * r, Math.sin(a) * r];
};

const attractorAt = (k: number, b: number) => {
  const orbit = (b - 12) * 0.32;
  const dx = ATTRACTORS[k][0] - WIDTH / 2;
  const dy = ATTRACTORS[k][1] - HEIGHT / 2;
  return [
    WIDTH / 2 + dx * Math.cos(orbit) - dy * Math.sin(orbit) * 1.6 + Math.sin(b * 1.3 + k * 1.7) * 50,
    HEIGHT / 2 + (dx * Math.sin(orbit)) / 1.6 + dy * Math.cos(orbit) + Math.cos(b * 1.1 + k * 2.3) * 40,
  ];
};

const BASE = Array.from({ length: COLS * ROWS }, (_, i) => {
  const x = (i % COLS) * TILE + TILE / 2;
  const y = Math.floor(i / COLS) * TILE + TILE / 2;
  let cluster = 0;
  let best = Infinity;
  ATTRACTORS.forEach(([ax, ay], k) => {
    const d = Math.hypot(x - ax, y - ay);
    if (d < best) {
      best = d;
      cluster = k;
    }
  });
  return { i, x, y, cluster, distance: best, delay: hash(i) * 0.32, bend: hash(i + 99) < 0.5 ? -1 : 1 };
});

const CLUSTER_INDEX = new Map<number, number>();
ATTRACTORS.forEach((_, k) => {
  BASE.filter((c) => c.cluster === k)
    .sort((a, b) => a.distance - b.distance)
    .forEach((c, j) => CLUSTER_INDEX.set(c.i, j));
});

const clusterPosition = (c: (typeof BASE)[number], b: number) => {
  const beatPulse = pulse(b, Math.floor(b), 0.25);
  const [ax, ay] = attractorAt(c.cluster, b);
  const [ox, oy] = phyllo(CLUSTER_INDEX.get(c.i)!, 23 * (1 + 0.12 * beatPulse), (b - 12) * (c.cluster % 2 ? 1.2 : -1.2));
  const drift = 7 * progress(b, 12.4, 13.2);
  return [ax + ox + noise2D("cx", c.i * 0.21, b * 0.8) * drift, ay + oy + noise2D("cy", c.i * 0.21, b * 0.8) * drift];
};

const phaseOneAt = (c: (typeof BASE)[number], b: number) => {
  const t = ease.inOutCubic(progress(b, 12 + c.delay, 13.1 + c.delay));
  const [tx, ty] = clusterPosition(c, b);
  const dx = tx - c.x;
  const dy = ty - c.y;
  const length = Math.hypot(dx, dy) || 1;
  const arc = Math.sin(Math.PI * t) * 70 * c.bend;
  return [lerp(c.x, tx, t) - (dy / length) * arc, lerp(c.y, ty, t) + (dx / length) * arc];
};

const GLOBAL_INDEX = new Map<number, number>();
BASE.map((c) => ({ c, d: Math.hypot(clusterPosition(c, 14)[0] - WIDTH / 2, clusterPosition(c, 14)[1] - HEIGHT / 2) }))
  .sort((a, b) => a.d - b.d)
  .forEach(({ c }, g) => GLOBAL_INDEX.set(c.i, g));

const positionAt = (c: (typeof BASE)[number], b: number) => {
  const [x1, y1] = phaseOneAt(c, b);
  const start = 14 + c.cluster * 0.1 + c.delay * 0.4;
  const t = ease.inOutCubic(progress(b, start, start + 0.9));
  const [ox, oy] = phyllo(GLOBAL_INDEX.get(c.i)!, 18, (b - 14) * 0.9);
  const wobble = progress(b, 14.6, 15.2) * 9;
  const x = lerp(x1, WIDTH / 2 + ox, t) + noise2D("wx", c.i * 0.37, b * 0.9) * wobble;
  const y = lerp(y1, HEIGHT / 2 + oy, t) + noise2D("wy", c.i * 0.37, b * 0.9) * wobble;
  return [x, y];
};

export const Liquid = () => {
  const b = useBeat();
  const tint = ease.inOutCubic(progress(b, 12.15, 13));
  const gloss = ease.outCubic(progress(b, 12, 12.6));
  const settle = ease.inOutCubic(progress(b, 15.2, 15.85));
  const kick = pulse(b, Math.floor(b), 0.2);
  const radius = lerp(CIRCLE_D / 2, 47, ease.outCubic(progress(b, 12, 13.2))) * (1 + 0.05 * kick * progress(b, 13, 14));
  const angle = (b - 12) * 0.9;
  const gx = Math.cos(angle) * 900;
  const gy = Math.sin(angle) * 500;

  return (
    <AbsoluteFill style={{ backgroundColor: mix(C.blue, C.ink, ease.inOutCubic(progress(b, 15.2, 15.9))) }}>
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="liquid-fill" gradientUnits="userSpaceOnUse" x1={960 - gx} y1={540 - gy} x2={960 + gx} y2={540 + gy}>
            <stop offset="0" stopColor={mix(C.bone, C.orange, tint)} />
            <stop offset="0.55" stopColor={mix(C.bone, C.pink, tint)} />
            <stop offset="1" stopColor={mix(C.bone, C.lime, tint)} />
          </linearGradient>
          <radialGradient id="sphere-shade" cx={960 - 90} cy={540 - 110} r={SPHERE_RADIUS * 1.45} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FFE9DD" />
            <stop offset="0.35" stopColor={C.orange} />
            <stop offset="0.8" stopColor="#8A1C0A" />
            <stop offset="1" stopColor="#2A0A08" />
          </radialGradient>
          <filter id="liquid" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation={16} result="blur" />
            <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -12" result="goo" />
            <feGaussianBlur in="goo" stdDeviation={8} result="soft" />
            <feSpecularLighting in="soft" surfaceScale={8} specularConstant={1.1} specularExponent={26} lightingColor="#ffffff" result="spec">
              <feDistantLight azimuth={225} elevation={42} />
            </feSpecularLighting>
            <feComposite in="spec" in2="goo" operator="in" result="specIn" />
            <feComposite in="goo" in2="specIn" operator="arithmetic" k1={0} k2={1} k3={0.9 * gloss} k4={0} />
          </filter>
        </defs>
        <g filter="url(#liquid)" opacity={1 - settle}>
          {BASE.map((c) => {
            const [x, y] = positionAt(c, b);
            return <circle key={c.i} cx={x} cy={y} r={radius} fill="url(#liquid-fill)" />;
          })}
        </g>
        {settle > 0 && (
          <circle cx={960} cy={540} r={SPHERE_RADIUS * (1 + 0.04 * pulse(b, 15.5, 0.2))} fill="url(#sphere-shade)" opacity={settle} />
        )}
      </svg>
    </AbsoluteFill>
  );
};
