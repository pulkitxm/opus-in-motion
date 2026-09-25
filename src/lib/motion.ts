import { useCurrentFrame } from "remotion";
import { FRAMES_PER_BEAT, SECONDS_PER_BEAT } from "../timeline";

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
export const progress = (t: number, start: number, end: number) => clamp((t - start) / (end - start));

export const ease = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => 1 - (1 - t) * (1 - t),
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t: number) => t * t * t * t,
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inExpo: (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: (t: number, overshoot = 1.70158) =>
    1 + (overshoot + 1) * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2),
  inBack: (t: number, overshoot = 1.70158) => (overshoot + 1) * t * t * t - overshoot * t * t,
};

export const springAt = (seconds: number, frequency = 2.4, damping = 0.42) => {
  if (seconds <= 0) return 0;
  const omega = 2 * Math.PI * frequency;
  if (damping >= 1) return 1 - Math.exp(-omega * seconds) * (1 + omega * seconds);
  const decay = damping * omega;
  const damped = omega * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-decay * seconds) * (Math.cos(damped * seconds) + (decay / damped) * Math.sin(damped * seconds));
};

export const beatSpring = (beat: number, start: number, frequency?: number, damping?: number) =>
  springAt((beat - start) * SECONDS_PER_BEAT, frequency, damping);

export const useBeat = () => useCurrentFrame() / FRAMES_PER_BEAT;

export const beatsToFrames = (beats: number) => beats * FRAMES_PER_BEAT;
export const framesToBeats = (frames: number) => frames / FRAMES_PER_BEAT;

export const random = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
};

const hexToRgb = (hex: string) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

export const mix = (from: string, to: string, t: number) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const k = clamp(t);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], k)));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

export const pulse = (beat: number, at: number, decayBeats = 0.35) =>
  beat < at ? 0 : Math.exp(-(beat - at) / decayBeats);
