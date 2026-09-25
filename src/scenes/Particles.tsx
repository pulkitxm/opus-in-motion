import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender } from "remotion";
import { C, fonts, fontsReady } from "../theme";
import { WIDTH, HEIGHT } from "../timeline";
import { ease, lerp, progress, random, useBeat } from "../lib/motion";
import { TITLE, TITLE_BASELINE, TITLE_SIZE, TITLE_TRACKING } from "./title";

const COUNT = 9000;
const FOCAL = 1400;
const COLORS = [C.bone, C.orange, C.pink, C.lime, C.blue];

const rand = random(2026);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());

const STARS = Array.from({ length: COUNT }, (_, i) => {
  const core = i % 7 === 0;
  const r = core ? 20 + Math.abs(gauss()) * 110 : 90 + Math.pow(rand(), 0.62) * 820;
  const arm = i % 3;
  const colorRoll = rand();
  const band = r / 910;
  const color = core
    ? colorRoll < 0.6
      ? C.bone
      : C.orange
    : colorRoll < 0.24
      ? C.bone
      : band < 0.35
        ? colorRoll < 0.7
          ? C.orange
          : C.pink
        : band < 0.7
          ? colorRoll < 0.6
            ? C.pink
            : C.orange
          : colorRoll < 0.6
            ? C.blue
            : C.lime;
  return {
    r,
    theta: core ? rand() * Math.PI * 2 : (arm * Math.PI * 2) / 3 + r * 0.0062 + (rand() - 0.5) * (0.35 + band * 0.9),
    height: core ? gauss() * 45 : (rand() - 0.5) * 70 * (1 - band * 0.8),
    speed: 1.7 * (260 / (r + 160)),
    delay: rand() * 0.4,
    swirl: (rand() - 0.5) * 220,
    size: 2.2 + rand() * 2.4,
    color,
    pick: rand(),
  };
});

const sampleTitle = () => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.font = `900 ${TITLE_SIZE}px "${fonts.display}"`;
  ctx.letterSpacing = `${TITLE_TRACKING}px`;
  ctx.fillText(TITLE, WIDTH / 2 - TITLE_TRACKING / 2, TITLE_BASELINE);
  const data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  const points: number[] = [];
  for (let y = 0; y < HEIGHT; y += 3) {
    for (let x = 0; x < WIDTH; x += 3) {
      if (data[(y * WIDTH + x) * 4 + 3] > 140) points.push(x, y);
    }
  }
  return points;
};

const useTitlePoints = () => {
  const [points, setPoints] = useState<number[] | null>(null);
  const [handle] = useState(() => delayRender("Sampling title glyphs"));
  useEffect(() => {
    fontsReady.then(() => {
      setPoints(sampleTitle());
      continueRender(handle);
    });
  }, [handle]);
  return points;
};

export const Particles = () => {
  const b = useBeat();
  const canvas = useRef<HTMLCanvasElement>(null);
  const bloom = useRef<HTMLCanvasElement>(null);
  const points = useTitlePoints();

  useLayoutEffect(() => {
    if (!canvas.current || !bloom.current || !points) return;
    const ctx = canvas.current.getContext("2d")!;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = "lighter";

    const bang = ease.outExpo(progress(b, 24, 24.8));
    const tilt = lerp(0.42, 1.0, ease.inOutCubic(progress(b, 24, 26.4)));
    const spin = (b - 24) * 0.55;
    const zoom = lerp(0.85, 1.1, ease.inOutCubic(progress(b, 24, 26.5)));
    const pointCount = points.length / 2;
    const buckets = new Map<string, number[]>();

    STARS.forEach((star, i) => {
      const theta = star.theta + spin * star.speed;
      const radius = star.r * bang;
      const x3 = Math.cos(theta) * radius;
      const z3 = Math.sin(theta) * radius;
      const y3 = star.height * bang;
      const y = y3 * Math.cos(tilt) - z3 * Math.sin(tilt);
      const z = y3 * Math.sin(tilt) + z3 * Math.cos(tilt);
      const k = (FOCAL / (FOCAL + z)) * zoom;
      const gx = WIDTH / 2 + x3 * k;
      const gy = HEIGHT / 2 + y * k;

      const target = Math.floor(star.pick * pointCount) * 2;
      const tx = points[target];
      const ty = points[target + 1];
      const t = ease.inOutCubic(progress(b, 25.9 + star.delay, 27.35 + star.delay));
      const dx = tx - gx;
      const dy = ty - gy;
      const length = Math.hypot(dx, dy) || 1;
      const arc = Math.sin(Math.PI * t) * star.swirl;
      const px = lerp(gx, tx, t) - (dy / length) * arc;
      const py = lerp(gy, ty, t) + (dx / length) * arc;
      const size = lerp(star.size * Math.min(1.6, k), 2.6, t);
      const color = t > 0.8 ? C.bone : star.color;
      const list = buckets.get(color) ?? [];
      list.push(px, py, size);
      buckets.set(color, list);
    });

    buckets.forEach((list, color) => {
      ctx.fillStyle = color;
      for (let i = 0; i < list.length; i += 3) {
        ctx.fillRect(list[i] - list[i + 2] / 2, list[i + 1] - list[i + 2] / 2, list[i + 2], list[i + 2]);
      }
    });

    const bctx = bloom.current.getContext("2d")!;
    bctx.clearRect(0, 0, WIDTH, HEIGHT);
    bctx.drawImage(canvas.current, 0, 0);
  }, [b, points]);

  const core = Math.exp(-Math.max(0, b - 24) * 6);
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <canvas ref={bloom} width={WIDTH} height={HEIGHT} style={{ position: "absolute", filter: "blur(12px) brightness(1.6)", opacity: 1 }} />
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} style={{ position: "absolute" }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,240,225,${0.95 * core}) 0%, rgba(255,120,60,${0.5 * core}) 12%, rgba(0,0,0,0) ${12 + 30 * (1 - core)}%)`,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};
