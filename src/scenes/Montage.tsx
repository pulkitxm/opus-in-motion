import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { WIDTH, HEIGHT } from "../timeline";
import { ease, lerp, progress, useBeat } from "../lib/motion";
import { Bars, Checker, Glitch, Halftone, Lissajous, Marquee, Radar, Sunburst, Toggle, type PanelProps } from "./panels";

type Rect = { x: number; y: number; w: number; h: number };
const M = 12;
const G = 12;

const cell = (cols: number, rows: number, c: number, r: number, cs = 1, rs = 1): Rect => {
  const cw = (WIDTH - 2 * M - (cols - 1) * G) / cols;
  const ch = (HEIGHT - 2 * M - (rows - 1) * G) / rows;
  return { x: M + c * (cw + G), y: M + r * (ch + G), w: cw * cs + G * (cs - 1), h: ch * rs + G * (rs - 1) };
};

const FULL: Rect = { x: 0, y: 0, w: WIDTH, h: HEIGHT };
const fromRight = (r: Rect): Rect => ({ ...r, x: r.x + r.w, w: 0 });
const fromBottom = (r: Rect): Rect => ({ ...r, y: r.y + r.h, h: 0 });
const fromCenter = (r: Rect): Rect => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: 0, h: 0 });

type Keyframe = { at: number; rect: Rect };
type Panel = { id: string; Component: (p: PanelProps) => React.ReactElement; enter: Rect; keys: Keyframe[] };

const PANELS: Panel[] = [
  {
    id: "A",
    Component: Marquee,
    enter: FULL,
    keys: [
      { at: 20, rect: FULL },
      { at: 20.5, rect: cell(2, 1, 0, 0) },
      { at: 21, rect: cell(2, 2, 0, 0) },
      { at: 21.5, rect: cell(3, 2, 0, 0) },
      { at: 22, rect: cell(3, 3, 0, 0) },
      { at: 22.5, rect: cell(4, 3, 0, 0, 2, 2) },
      { at: 23, rect: cell(4, 3, 0, 0) },
    ],
  },
  {
    id: "B",
    Component: Lissajous,
    enter: fromRight(cell(2, 1, 1, 0)),
    keys: [
      { at: 20.5, rect: cell(2, 1, 1, 0) },
      { at: 21, rect: cell(2, 2, 1, 0) },
      { at: 21.5, rect: cell(3, 2, 1, 0) },
      { at: 22, rect: cell(3, 3, 1, 0) },
      { at: 22.5, rect: cell(4, 3, 2, 0) },
      { at: 23, rect: cell(4, 3, 1, 0) },
    ],
  },
  {
    id: "C",
    Component: Bars,
    enter: fromBottom(cell(2, 2, 0, 1)),
    keys: [
      { at: 21, rect: cell(2, 2, 0, 1) },
      { at: 21.5, rect: cell(3, 2, 0, 1) },
      { at: 22, rect: cell(3, 3, 0, 1) },
      { at: 22.5, rect: cell(4, 3, 2, 1) },
      { at: 23, rect: cell(4, 3, 1, 1) },
    ],
  },
  {
    id: "D",
    Component: Radar,
    enter: fromBottom(cell(2, 2, 1, 1)),
    keys: [
      { at: 21, rect: cell(2, 2, 1, 1) },
      { at: 21.5, rect: cell(3, 2, 1, 1) },
      { at: 22, rect: cell(3, 3, 2, 1) },
      { at: 22.5, rect: cell(4, 3, 0, 2) },
      { at: 23, rect: cell(4, 3, 0, 2) },
    ],
  },
  {
    id: "E",
    Component: Glitch,
    enter: fromRight(cell(3, 2, 2, 0)),
    keys: [
      { at: 21.5, rect: cell(3, 2, 2, 0) },
      { at: 22, rect: cell(3, 3, 2, 0) },
      { at: 22.5, rect: cell(4, 3, 3, 0) },
      { at: 23, rect: cell(4, 3, 0, 1) },
    ],
  },
  {
    id: "F",
    Component: Toggle,
    enter: fromRight(cell(3, 2, 2, 1)),
    keys: [
      { at: 21.5, rect: cell(3, 2, 2, 1) },
      { at: 22, rect: cell(3, 3, 0, 2) },
      { at: 22.5, rect: cell(4, 3, 1, 2) },
      { at: 23, rect: cell(4, 3, 1, 2) },
    ],
  },
  {
    id: "G",
    Component: Halftone,
    enter: fromCenter(cell(3, 3, 1, 1)),
    keys: [
      { at: 22, rect: cell(3, 3, 1, 1) },
      { at: 22.5, rect: cell(4, 3, 3, 1) },
      { at: 23, rect: cell(4, 3, 2, 0, 2, 2) },
    ],
  },
  {
    id: "H",
    Component: Checker,
    enter: fromBottom(cell(3, 3, 1, 2)),
    keys: [
      { at: 22, rect: cell(3, 3, 1, 2) },
      { at: 22.5, rect: cell(4, 3, 2, 2) },
      { at: 23, rect: cell(4, 3, 2, 2) },
    ],
  },
  {
    id: "I",
    Component: Sunburst,
    enter: fromBottom(cell(3, 3, 2, 2)),
    keys: [
      { at: 22, rect: cell(3, 3, 2, 2) },
      { at: 22.5, rect: cell(4, 3, 3, 2) },
      { at: 23, rect: cell(4, 3, 3, 2) },
    ],
  },
];

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
});

const rectAt = (panel: Panel, b: number): Rect | null => {
  if (b < panel.keys[0].at) return null;
  let previous = panel.enter;
  let rect = panel.enter;
  for (const key of panel.keys) {
    if (b < key.at) break;
    const t = ease.outQuart(progress(b, key.at, key.at + 0.42));
    rect = lerpRect(previous, key.rect, t);
    previous = key.rect;
  }
  return rect;
};

export const Montage = () => {
  const b = useBeat();
  const radius = 18 * progress(b, 20.5, 20.8);
  const flash = 1 - ease.outCubic(progress(b, 20, 20.18));

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      {PANELS.map((panel, i) => {
        const rect = rectAt(panel, b);
        if (!rect || rect.w < 1 || rect.h < 1) return null;
        const collapse = ease.inExpo(progress(b, 23.3 + i * 0.035, 23.86 + i * 0.01));
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        const scale = 1 - collapse;
        const w = Math.round(rect.w);
        const h = Math.round(rect.h);
        return (
          <div
            key={panel.id}
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: w,
              height: h,
              borderRadius: radius,
              overflow: "hidden",
              transform: `translate(${(WIDTH / 2 - cx) * collapse}px, ${(HEIGHT / 2 - cy) * collapse}px) scale(${scale}) rotate(${collapse * 90}deg)`,
            }}
          >
            <panel.Component w={w} h={h} b={b} />
          </div>
        );
      })}
      <AbsoluteFill style={{ backgroundColor: C.bone, opacity: flash }} />
    </AbsoluteFill>
  );
};
