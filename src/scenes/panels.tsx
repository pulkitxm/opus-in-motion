import { C, fonts } from "../theme";
import { beatSpring, ease, hash, lerp, progress } from "../lib/motion";
import { FRAMES_PER_BEAT } from "../timeline";

export type PanelProps = { w: number; h: number; b: number };

export const Marquee = ({ w, h, b }: PanelProps) => {
  const size = Math.max(40, h / 4.6);
  const rows = Math.ceil(h / (size * 0.92)) + 1;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.orange, overflow: "hidden" }}>
      {Array.from({ length: rows }, (_, r) => {
        const dir = r % 2 === 0 ? -1 : 1;
        const offset = dir * (b - 20) * size * 1.6 - size * 4 - r * size * 0.7;
        const serif = r % 2 === 1;
        return (
          <div
            key={r}
            style={{
              position: "absolute",
              top: r * size * 0.92 - size * 0.12,
              left: 0,
              whiteSpace: "nowrap",
              transform: `translateX(${offset}px)`,
              fontFamily: serif ? fonts.serif : fonts.display,
              fontStyle: serif ? "italic" : "normal",
              fontWeight: serif ? 400 : 900,
              fontSize: size,
              lineHeight: 1,
              letterSpacing: serif ? "-0.02em" : "-0.04em",
              color: C.ink,
            }}
          >
            {(serif ? "motion design ✺ " : "MOTION ✺ DESIGN ✺ ").repeat(8)}
          </div>
        );
      })}
    </div>
  );
};

export const Lissajous = ({ w, h, b }: PanelProps) => {
  const n = 700;
  const draw = ease.outCubic(progress(b, 20.45, 21.5));
  const phase = (b - 20.5) * 0.9;
  const scale = Math.min(w, h) * 0.38;
  const points: [number, number][] = [];
  for (let i = 0; i <= n * draw; i++) {
    const t = (i / n) * Math.PI * 2;
    points.push([w / 2 + Math.sin(3 * t + phase) * scale * 1.25, h / 2 + Math.sin(4 * t) * scale]);
  }
  const head = points[points.length - 1] ?? [w / 2, h / 2];
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.ink }}>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke={C.bone} strokeOpacity={0.12} />
        <line x1={w / 2} x2={w / 2} y1={0} y2={h} stroke={C.bone} strokeOpacity={0.12} />
        <polyline points={points.map((p) => p.join(",")).join(" ")} fill="none" stroke={C.lime} strokeWidth={Math.max(2, scale * 0.018)} strokeLinejoin="round" />
        <circle cx={head[0]} cy={head[1]} r={Math.max(4, scale * 0.045)} fill={C.bone} />
      </svg>
    </div>
  );
};

const BAR_HEIGHTS = Array.from({ length: 12 }, (_, i) => 0.25 + hash(i * 3.3) * 0.7);

export const Bars = ({ w, h, b }: PanelProps) => {
  const pad = Math.min(w, h) * 0.12;
  const base = h - pad;
  const barW = (w - pad * 2) / BAR_HEIGHTS.length;
  const count = Math.round(248 * ease.outExpo(progress(b, 21, 21.9)));
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.bone }}>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        <line x1={pad} x2={w - pad} y1={base} y2={base} stroke={C.ink} strokeWidth={2} />
        {BAR_HEIGHTS.map((v, i) => {
          const grow = beatSpring(b, 21 + i * 0.035, 2.6, 0.45);
          const bh = v * (h - pad * 2.6) * grow * (1 + 0.12 * Math.sin((b - 21) * 5 + i));
          return <rect key={i} x={pad + i * barW + barW * 0.14} y={base - bh} width={barW * 0.72} height={Math.max(0, bh)} fill={i === 7 ? C.orange : C.ink} />;
        })}
      </svg>
      <div style={{ position: "absolute", left: pad, top: pad * 0.6, fontFamily: fonts.display, fontWeight: 800, fontSize: Math.min(w, h) * 0.2, letterSpacing: "-0.04em", color: C.blue, lineHeight: 1 }}>
        +{count}%
      </div>
    </div>
  );
};

export const Radar = ({ w, h, b }: PanelProps) => {
  const maxR = Math.hypot(w, h) / 2;
  const sweep = (b - 21) * 140;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.pink }}>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        {Array.from({ length: 7 }, (_, k) => {
          const f = (((b - 21) * 0.9 + k / 7) % 1 + 1) % 1;
          return <circle key={k} cx={w / 2} cy={h / 2} r={f * maxR} fill="none" stroke={C.ink} strokeWidth={Math.max(1.5, maxR * 0.012)} opacity={1 - f} />;
        })}
        <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke={C.ink} strokeOpacity={0.35} />
        <line x1={w / 2} x2={w / 2} y1={0} y2={h} stroke={C.ink} strokeOpacity={0.35} />
        <g transform={`translate(${w / 2} ${h / 2}) rotate(${sweep})`}>
          <path d={`M0,0 L${maxR},0 A${maxR},${maxR} 0 0 0 ${maxR * Math.cos(-0.5)},${maxR * Math.sin(-0.5)} Z`} fill={C.ink} opacity={0.18} />
          <line x1={0} y1={0} x2={maxR} y2={0} stroke={C.ink} strokeWidth={2} />
        </g>
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.05 * (1 + 0.3 * Math.exp(-((b % 1) * 6)))} fill={C.ink} />
      </svg>
    </div>
  );
};

export const Glitch = ({ w, h, b }: PanelProps) => {
  const frame = Math.round(b * FRAMES_PER_BEAT);
  const step = Math.floor(frame / 3);
  const size = Math.min(h * 0.55, w * 0.3);
  const slices = 9;
  const intensity = 0.4 + 0.6 * Math.exp(-((b * 2) % 1) * 4);
  const text = (color: string, dx: number, blend?: boolean) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: "-0.05em",
        color,
        transform: `translateX(${dx}px)`,
        mixBlendMode: blend ? "screen" : undefined,
      }}
    >
      REEL
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.ink, overflow: "hidden" }}>
      {Array.from({ length: slices }, (_, i) => {
        const shift = (hash(step * 17 + i) - 0.5) * size * 0.5 * intensity * (hash(step + i * 5) > 0.55 ? 1 : 0);
        return (
          <div key={i} style={{ position: "absolute", inset: 0, clipPath: `inset(${(i / slices) * 100}% 0 ${100 - ((i + 1) / slices) * 100}% 0)`, transform: `translateX(${shift}px)` }}>
            {text(C.orange, -size * 0.03 * intensity, true)}
            {text(C.blue, size * 0.03 * intensity, true)}
            {text(C.bone, 0, true)}
          </div>
        );
      })}
    </div>
  );
};

export const Toggle = ({ w, h, b }: PanelProps) => {
  const s = Math.min(w, h) / 360;
  const on = beatSpring(b, 22, 3, 0.5) - beatSpring(b, 23, 3, 0.5);
  const cursorT = ease.inOutCubic(progress(b, 21.5, 21.92));
  const press = 1 - 0.2 * Math.exp(-Math.pow(((b - 21.97) * FRAMES_PER_BEAT) / 3, 2));
  const trackW = 180 * s;
  const trackH = 96 * s;
  const knob = 76 * s;
  const cx = w / 2;
  const cy = h / 2 + 10 * s;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.lime }}>
      <div style={{ position: "absolute", left: cx - 150 * s, top: cy - 120 * s, width: 300 * s, height: 240 * s, borderRadius: 36 * s, backgroundColor: C.ink }} />
      <div style={{ position: "absolute", left: cx - 150 * s + 28 * s, top: cy - 96 * s, fontFamily: fonts.mono, fontSize: 15 * s, letterSpacing: "0.14em", color: C.bone, opacity: 0.7 }}>
        SPRING 180 / 12
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - trackW / 2,
          top: cy - trackH / 2 + 18 * s,
          width: trackW,
          height: trackH,
          borderRadius: trackH,
          backgroundColor: on > 0.5 ? C.orange : "#34343c",
          transform: `scale(${press})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: (trackH - knob) / 2,
            left: lerp((trackH - knob) / 2, trackW - knob - (trackH - knob) / 2, on),
            width: knob * (1 + 0.25 * Math.sin(Math.PI * Math.min(1, Math.max(0, on)))),
            height: knob,
            borderRadius: knob,
            backgroundColor: C.bone,
          }}
        />
      </div>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        <g transform={`translate(${lerp(w * 0.95, cx + 40 * s, cursorT)} ${lerp(h * 0.95, cy + 30 * s, cursorT)}) scale(${s * 1.6 * press})`}>
          <path d="M0,0 L0,26 L7,19 L12,30 L17,28 L12,17 L22,17 Z" fill={C.bone} stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
};

export const Halftone = ({ w, h, b }: PanelProps) => {
  const gap = Math.max(18, Math.min(w, h) / 13);
  const cols = Math.ceil(w / gap) + 1;
  const rows = Math.ceil(h / gap) + 1;
  const fx = w / 2 + Math.cos(b * 2.2) * w * 0.25;
  const fy = h / 2 + Math.sin(b * 2.9) * h * 0.25;
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * gap + (r % 2) * gap * 0.5;
      const y = r * gap;
      const d = Math.hypot(x - fx, y - fy) / Math.max(w, h);
      const v = 0.5 + 0.5 * Math.sin(d * 18 - b * 7);
      dots.push(<circle key={`${r}-${c}`} cx={x} cy={y} r={gap * 0.48 * v} fill={C.bone} />);
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.blue }}>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        {dots}
      </svg>
    </div>
  );
};

export const Checker = ({ w, h, b }: PanelProps) => {
  const cell = Math.max(20, Math.min(w, h) / 7);
  const cols = Math.ceil(w / cell) + 3;
  const rows = Math.ceil(h / cell) + 1;
  const squares = [];
  for (let r = 0; r < rows; r++) {
    const shift = Math.sin(r * 0.7 + b * 5) * cell * 0.9;
    for (let c = -2; c < cols; c++) {
      if ((r + c) % 2 !== 0) continue;
      squares.push(<rect key={`${r}-${c}`} x={c * cell + shift} y={r * cell} width={cell} height={cell} fill={C.bone} />);
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.ink }}>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        {squares}
      </svg>
    </div>
  );
};

export const Sunburst = ({ w, h, b }: PanelProps) => {
  const R = Math.hypot(w, h);
  const wedges = 24;
  const rot = (b - 22) * 50;
  const bounce = Math.abs(Math.sin((b - 22) * Math.PI * 2));
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: C.orange }}>
      <svg width={w} height={h} style={{ position: "absolute" }}>
        <g transform={`translate(${w / 2} ${h / 2}) rotate(${rot})`}>
          {Array.from({ length: wedges }, (_, i) => {
            if (i % 2) return null;
            const a0 = (i / wedges) * Math.PI * 2;
            const a1 = ((i + 1) / wedges) * Math.PI * 2;
            return <path key={i} d={`M0,0 L${Math.cos(a0) * R},${Math.sin(a0) * R} L${Math.cos(a1) * R},${Math.sin(a1) * R} Z`} fill={C.ink} />;
          })}
        </g>
        <ellipse cx={w / 2} cy={h / 2 - bounce * Math.min(w, h) * 0.12} rx={Math.min(w, h) * 0.16 * (1 + 0.15 * (1 - bounce))} ry={Math.min(w, h) * 0.16 * (1 - 0.15 * (1 - bounce))} fill={C.bone} />
      </svg>
    </div>
  );
};
