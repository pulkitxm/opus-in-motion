import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { beatSpring, ease, lerp, mix, progress, random, useBeat } from "../lib/motion";

export const TILE = 120;
export const COLS = 16;
export const ROWS = 9;
export const CIRCLE_D = 72;

type Geometry = { x: number; y: number; w: number; h: number; r: [number, number, number, number] };

const T = TILE;
const SHAPES: Record<string, Geometry> = {
  quarter: { x: 0, y: 0, w: T, h: T, r: [T, 0, 0, 0] },
  half: { x: 0, y: T / 2, w: T, h: T / 2, r: [T / 2, T / 2, 0, 0] },
  circle: { x: T * 0.12, y: T * 0.12, w: T * 0.76, h: T * 0.76, r: [T * 0.38, T * 0.38, T * 0.38, T * 0.38] },
  square: { x: T * 0.22, y: T * 0.22, w: T * 0.56, h: T * 0.56, r: [0, 0, 0, 0] },
  leaf: { x: 0, y: 0, w: T, h: T, r: [T, 0, T, 0] },
  pill: { x: T * 0.08, y: T * 0.3, w: T * 0.84, h: T * 0.4, r: [T * 0.2, T * 0.2, T * 0.2, T * 0.2] },
  dot: { x: T * 0.34, y: T * 0.34, w: T * 0.32, h: T * 0.32, r: [T * 0.16, T * 0.16, T * 0.16, T * 0.16] },
};
const SHAPE_KEYS = Object.keys(SHAPES);
const D = CIRCLE_D;
const FINAL: Geometry = { x: T / 2 - D / 2, y: T / 2 - D / 2, w: D, h: D, r: [D / 2, D / 2, D / 2, D / 2] };

const BACKGROUNDS = [C.blue, C.blue, C.blue, C.blue, C.ink, C.ink, C.bone, C.orange];
const FOREGROUNDS = [C.bone, C.bone, C.orange, C.orange, C.ink, C.lime, C.pink, C.blue];

const rand = random(8);
const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];

const TILES = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const bg = pick(BACKGROUNDS);
  const fg = pick(FOREGROUNDS.filter((c) => c !== bg));
  return {
    col,
    row,
    bg,
    fg,
    shape: SHAPES[pick(SHAPE_KEYS)],
    rotation: Math.floor(rand() * 4) * 90,
    direction: rand() < 0.5 ? 1 : -1,
    flipper: rand() < 0.32,
  };
});

const ROTATIONS = [
  { at: 6, origin: [8, 4] },
  { at: 7, origin: [0, 0] },
  { at: 8, origin: [7.5, 4] },
  { at: 9, origin: [15, 0] },
  { at: 10, origin: [0, 8] },
];
const FLIPS = [8.5, 9.5, 10.25];

const lerpGeometry = (a: Geometry, b: Geometry, t: number): Geometry => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
  r: a.r.map((v, i) => lerp(v, b.r[i], t)) as Geometry["r"],
});

export const Grid = () => {
  const b = useBeat();
  return (
    <AbsoluteFill style={{ backgroundColor: C.blue }}>
      {TILES.map((tile, i) => {
        let angle = tile.rotation;
        for (const event of ROTATIONS) {
          const distance = Math.hypot(tile.col - event.origin[0], tile.row - event.origin[1]);
          angle += 90 * tile.direction * beatSpring(b, event.at + distance * 0.028, 3.2, 0.48);
        }

        let swapped = false;
        let flipAngle = 0;
        if (tile.flipper) {
          for (const at of FLIPS) {
            const f = ease.inOutCubic(progress(b, at + tile.col * 0.018, at + tile.col * 0.018 + 0.32));
            if (f >= 0.5) swapped = !swapped;
            if (f > 0 && f < 1) flipAngle = f < 0.5 ? f * 180 : f * 180 - 180;
          }
        }

        const morph = ease.inOutCubic(progress(b, 10.5 + ((tile.col + tile.row) / 24) * 0.45, 11.05 + ((tile.col + tile.row) / 24) * 0.45));
        const baseBg = swapped ? tile.fg : tile.bg;
        const baseFg = swapped ? tile.bg : tile.fg;
        const geometry = lerpGeometry(tile.shape, FINAL, morph);
        const breathe = 1 + 0.08 * Math.max(0, Math.sin(Math.PI * progress(b, 11.5, 11.9)));

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: tile.col * TILE,
              top: tile.row * TILE,
              width: TILE,
              height: TILE,
              backgroundColor: mix(baseBg, C.blue, morph),
              transform: `perspective(700px) rotateY(${flipAngle}deg) rotate(${angle * (1 - morph)}deg) scale(${breathe})`,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: geometry.x,
                top: geometry.y,
                width: geometry.w,
                height: geometry.h,
                borderRadius: geometry.r.map((v) => `${v}px`).join(" "),
                backgroundColor: mix(baseFg, C.bone, morph),
              }}
            />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
