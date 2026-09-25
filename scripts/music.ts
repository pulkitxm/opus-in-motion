import { writeFileSync } from "node:fs";
import { BPM, TOTAL_BEATS } from "../src/timeline.ts";

const SR = 48000;
const SPB = 60 / BPM;
const LENGTH = Math.round(TOTAL_BEATS * SPB * SR);

const drums = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
const ducked = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
const verbSend = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
const echoSend = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
const kicks: number[] = [];

let seed = 7;
const rnd = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const hz = (note: number) => 440 * Math.pow(2, (note - 69) / 12);
const sec = (beat: number) => beat * SPB;

type Bus = Float32Array[];
type Options = { gain?: number; pan?: number; verb?: number; echo?: number; bus?: Bus };

const voice = (beat: number, duration: number, render: (t: number, i: number) => number, options: Options = {}) => {
  const { gain = 1, pan = 0, verb = 0, echo = 0, bus = drums } = options;
  const start = Math.round(sec(beat) * SR);
  const count = Math.round(duration * SR);
  const left = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const right = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  for (let i = 0; i < count; i++) {
    const index = start + i;
    if (index < 0) continue;
    if (index >= LENGTH) break;
    const v = render(i / SR, i);
    bus[0][index] += v * left;
    bus[1][index] += v * right;
    if (verb) {
      verbSend[0][index] += v * left * verb;
      verbSend[1][index] += v * right * verb;
    }
    if (echo) {
      echoSend[0][index] += v * left * echo;
      echoSend[1][index] += v * right * echo;
    }
  }
};

const svf = () => {
  let ic1 = 0;
  let ic2 = 0;
  return (x: number, cutoff: number, resonance = 0.1) => {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
    const k = 2 - 2 * resonance;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return { lp: v2, bp: v1, hp: x - k * v1 - v2 };
  };
};

const blep = (t: number, dt: number) => {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
};

const sawOsc = (freq: number) => {
  let phase = rnd();
  const dt = freq / SR;
  return () => {
    phase += dt;
    if (phase >= 1) phase -= 1;
    return 2 * phase - 1 - blep(phase, dt);
  };
};

const envelope = (t: number, attack: number, hold: number, release: number) => {
  if (t < attack) return t / attack;
  if (t < attack + hold) return 1;
  return Math.max(0, 1 - (t - attack - hold) / release);
};

const kick = (beat: number, gain = 1, big = false) => {
  kicks.push(sec(beat));
  let phase = 0;
  voice(
    beat,
    big ? 1.1 : 0.45,
    (t) => {
      const f = 46 + (big ? 170 : 140) * Math.exp(-t * (big ? 20 : 30));
      phase += (2 * Math.PI * f) / SR;
      const body = Math.sin(phase) * Math.exp(-t * (big ? 3.2 : 7.5));
      const click = noise() * Math.exp(-t * 400) * 0.35;
      return Math.tanh(1.7 * (body + click));
    },
    { gain, verb: big ? 0.12 : 0.03 },
  );
};

const clap = (beat: number, gain = 0.5) => {
  const filter = svf();
  voice(
    beat,
    0.35,
    (t) => {
      const bursts = [0, 0.011, 0.023].reduce((sum, o) => sum + (t >= o ? Math.exp(-(t - o) * 190) : 0), 0);
      const tail = t > 0.028 ? Math.exp(-(t - 0.028) * 16) * 0.8 : 0;
      return filter(noise(), 1500, 0.35).bp * (bursts + tail) * 2.2;
    },
    { gain, verb: 0.35 },
  );
};

const hat = (beat: number, gain = 0.12, open = false, pan = 0) => {
  const filter = svf();
  voice(beat, open ? 0.4 : 0.07, (t) => filter(noise(), 8200, 0.2).hp * Math.exp(-t * (open ? 11 : 75)), { gain, pan, verb: 0.05 });
};

const snare = (beat: number, gain = 0.4) => {
  const filter = svf();
  let phase = 0;
  voice(
    beat,
    0.25,
    (t) => {
      phase += (2 * Math.PI * (180 + 60 * Math.exp(-t * 40))) / SR;
      return Math.sin(phase) * Math.exp(-t * 22) * 0.6 + filter(noise(), 3200, 0.2).bp * Math.exp(-t * 15) * 1.4;
    },
    { gain, verb: 0.25 },
  );
};

const tick = (beat: number, gain = 0.1, freq = 3200, pan = 0) => {
  voice(beat, 0.04, (t) => Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 130), { gain, pan, verb: 0.08 });
};

const wood = (beat: number, gain = 0.12, freq = 1200, pan = 0) => {
  voice(beat, 0.08, (t) => (Math.sin(2 * Math.PI * freq * t) + 0.4 * Math.sin(2 * Math.PI * freq * 2.7 * t)) * Math.exp(-t * 70), {
    gain,
    pan,
    verb: 0.12,
  });
};

const bloop = (beat: number, note: number, gain = 0.3, pan = 0) => {
  const f = hz(note);
  let phase = 0;
  voice(
    beat,
    0.6,
    (t) => {
      const freq = f * (1 + 1.2 * Math.exp(-t * 55));
      phase += (2 * Math.PI * freq) / SR;
      const fm = Math.sin(phase * 2) * 1.4 * Math.exp(-t * 12);
      return Math.sin(phase + fm) * Math.exp(-t * 7.5);
    },
    { gain, pan, verb: 0.3, echo: 0.18 },
  );
};

const drop = (beat: number, gain = 0.2, base = 700, pan = 0) => {
  let phase = 0;
  voice(
    beat,
    0.14,
    (t) => {
      phase += (2 * Math.PI * base * (1 + 1.6 * (1 - Math.exp(-t * 35)))) / SR;
      return Math.sin(phase) * Math.exp(-t * 28);
    },
    { gain, pan, verb: 0.35, echo: 0.15 },
  );
};

const sweep = (beat: number, duration: number, from: number, to: number, gain = 0.2, shape = (u: number) => u) => {
  let phase = 0;
  voice(
    beat,
    duration,
    (t) => {
      const u = t / duration;
      phase += (2 * Math.PI * from * Math.pow(to / from, u)) / SR;
      return Math.sin(phase) * shape(u);
    },
    { gain, verb: 0.3 },
  );
};

const riser = (from: number, to: number, gain = 0.25) => {
  const filter = svf();
  const duration = sec(to - from);
  voice(
    from,
    duration,
    (t) => {
      const u = t / duration;
      return filter(noise(), 300 * Math.pow(30, u), 0.45).bp * Math.pow(u, 2.2);
    },
    { gain, verb: 0.3 },
  );
};

const whoosh = (beat: number, duration: number, gain = 0.3, panFrom = -0.6, panTo = 0.6) => {
  const filter = svf();
  const start = Math.round(sec(beat) * SR);
  const count = Math.round(duration * SR);
  for (let i = 0; i < count && start + i < LENGTH; i++) {
    const u = i / count;
    const v = filter(noise(), 350 + 3200 * Math.sin(Math.PI * u), 0.5).bp * Math.pow(Math.sin(Math.PI * u), 2) * gain * 2;
    const pan = panFrom + (panTo - panFrom) * u;
    drums[0][start + i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
    drums[1][start + i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
    verbSend[0][start + i] += v * 0.2;
    verbSend[1][start + i] += v * 0.2;
  }
};

const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
const crashSample = (duration: number) => {
  const filter = svf();
  const out = new Float32Array(Math.round(duration * SR));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const metal = METAL.reduce((sum, f) => sum + (Math.sin(2 * Math.PI * f * 3.1 * t) > 0 ? 1 : -1), 0) / METAL.length;
    out[i] = filter(noise() * 0.8 + metal * 0.5, 6500, 0.15).hp * Math.exp(-t * 2.4);
  }
  return out;
};

const crash = (beat: number, gain = 0.25) => {
  const sample = crashSample(2.2);
  voice(beat, 2.2, (_, i) => sample[i], { gain, verb: 0.3, pan: 0.15 });
  voice(beat + 0.004, 2.2, (_, i) => sample[Math.max(0, i - 90)], { gain: gain * 0.8, pan: -0.3 });
};

const reverseCrash = (endBeat: number, duration: number, gain = 0.2) => {
  const sample = crashSample(duration);
  voice(endBeat - duration / SPB, duration, (_, i) => sample[sample.length - 1 - i] * Math.pow(i / sample.length, 0.6), { gain, verb: 0.2 });
};

const sub = (beat: number, gain = 0.6, duration = 1.4) => {
  let phase = 0;
  voice(
    beat,
    duration,
    (t) => {
      phase += (2 * Math.PI * (28 + 50 * Math.exp(-t * 3.5))) / SR;
      return Math.sin(phase) * Math.exp(-t * 2.2);
    },
    { gain },
  );
};

const boom = (beat: number, gain = 0.5) => {
  const filter = svf();
  voice(beat, 1.6, (t) => filter(noise(), 180 + 2400 * Math.exp(-t * 5), 0.1).lp * Math.exp(-t * 3), { gain, verb: 0.6 });
};

const impact = (beat: number, gain = 1) => {
  kick(beat, gain, true);
  sub(beat, 0.55 * gain);
  boom(beat, 0.55 * gain);
  crash(beat, 0.3 * gain);
};

const glass = (beat: number, gain = 0.2) => {
  for (let k = 0; k < 14; k++) {
    const f = 2600 + rnd() * 5200;
    const offset = rnd() * 0.22;
    voice(beat + offset / SPB, 0.25, (t) => Math.sin(2 * Math.PI * f * t) * Math.exp(-t * (30 + rnd() * 10)), { gain: gain * (0.5 + rnd() * 0.5), pan: rnd() * 1.6 - 0.8, verb: 0.4 });
  }
  const filter = svf();
  voice(beat, 0.3, (t) => filter(noise(), 5000, 0.3).hp * Math.exp(-t * 14), { gain: gain * 1.4, verb: 0.3 });
};

const pluck = (beat: number, note: number, gain = 0.12, pan = 0, bright = 1) => {
  const a = sawOsc(hz(note));
  const b = sawOsc(hz(note) * 1.004);
  const filter = svf();
  voice(
    beat,
    0.45,
    (t) => filter((a() + b()) * 0.5, 350 + 3800 * bright * Math.exp(-t * 16), 0.3).lp * Math.exp(-t * 8),
    { gain: gain * 1.45, pan, verb: 0.25, echo: 0.3, bus: ducked },
  );
};

const bass = (beat: number, beats: number, note: number, gain = 0.32) => {
  const a = sawOsc(hz(note));
  const b = sawOsc(hz(note) * 0.996);
  const filter = svf();
  const duration = sec(beats);
  voice(
    beat,
    duration,
    (t) => {
      const body = filter((a() + b()) * 0.5, 160 + 1500 * Math.exp(-t * 10), 0.4).lp;
      const subTone = Math.sin(2 * Math.PI * hz(note) * t) * 0.8;
      return (body + subTone) * envelope(t, 0.004, duration - 0.03, 0.025);
    },
    { gain, bus: ducked },
  );
};

const pad = (beat: number, beats: number, notes: number[], gain = 0.05, cutoff: (u: number) => number = () => 1100, verb = 0.45) => {
  const duration = sec(beats);
  notes.forEach((note, n) => {
    [-0.5, 0, 0.5].forEach((pan, d) => {
      const osc = sawOsc(hz(note) * (1 + (d - 1) * 0.0045));
      const filter = svf();
      voice(beat, duration + 0.6, (t) => filter(osc(), cutoff(t / duration), 0.15).lp * envelope(t, 0.18, duration - 0.18, 0.5), {
        gain: (gain * 1.3) / (1 + n * 0.1),
        pan,
        verb,
        bus: ducked,
      });
    });
  });
};

const stab = (beat: number, notes: number[], gain = 0.07) => {
  notes.forEach((note) => {
    for (let d = 0; d < 5; d++) {
      const osc = sawOsc(hz(note) * (1 + (d - 2) * 0.006));
      const filter = svf();
      voice(beat, 1.6, (t) => filter(osc(), 500 + 5000 * Math.exp(-t * 4), 0.2).lp * Math.exp(-t * 2.2), { gain: gain * 1.3, pan: (d - 2) * 0.35, verb: 0.6 });
    }
  });
};

const CHORDS: Record<string, { root: number; notes: number[]; arp: number[] }> = {
  Fm: { root: 29, notes: [53, 56, 60, 63], arp: [65, 68, 72, 75, 77, 75, 72, 68] },
  Db: { root: 25, notes: [49, 53, 56, 60], arp: [61, 65, 68, 72, 73, 72, 68, 65] },
  Ab: { root: 32, notes: [56, 60, 63, 67], arp: [68, 72, 75, 79, 80, 79, 75, 72] },
  Eb: { root: 27, notes: [51, 55, 58, 65], arp: [63, 67, 70, 74, 75, 74, 70, 67] },
  Fm9: { root: 29, notes: [53, 56, 60, 63, 67], arp: [65, 68, 72, 75, 79, 75, 72, 68] },
};
const BARS = ["Fm", "Fm", "Db", "Ab", "Eb", "Fm", "Db", "Fm9"];
const IMPACT_BEATS = new Set([4, 16, 18, 20, 28]);

pad(0, 4, CHORDS.Fm.notes, 0.035, (u) => 350 + 600 * u);
for (let s = 0; s < 8; s++) tick(s * 0.5, s % 2 ? 0.05 : 0.08, s % 2 ? 2200 : 2800, s % 2 ? 0.3 : -0.3);
[1, 2, 3].forEach((b, i) => {
  bloop(b, [68, 72, 75][i], 0.34, -0.3 + i * 0.3);
  kick(b, 0.4);
});
sweep(3.12, sec(0.38), 140, 520, 0.12, (u) => u * u);
riser(2, 4, 0.22);
whoosh(3.45, sec(0.55), 0.35, -0.2, 0.2);
reverseCrash(4, sec(1.2), 0.22);

for (let bar = 1; bar < 8; bar++) {
  const chord = CHORDS[BARS[bar]];
  const start = bar * 4;
  const build = bar === 6;
  if (!build && bar !== 7) {
    pad(start, 4, chord.notes, 0.028, (u) => 900 + 500 * Math.sin(Math.PI * u));
  }
  for (let beat = 0; beat < 4; beat++) {
    const b = start + beat;
    if (build || b === 31) continue;
    if (b === 15) {
      kick(b, 0.9);
      continue;
    }
    if (!IMPACT_BEATS.has(b)) kick(b, bar === 7 ? 0.75 : 0.95);
    if (beat % 2 === 1) clap(b, bar === 7 ? 0.38 : 0.5);
    hat(b + 0.5, 0.14, bar === 5 || bar === 4, 0.2);
    hat(b + 0.25, 0.05, false, -0.3);
    hat(b + 0.75, 0.05, false, 0.35);
    if (bar === 5) {
      hat(b, 0.06, false, -0.2);
      hat(b + 0.125, 0.03, false, 0.4);
      hat(b + 0.625, 0.03, false, -0.4);
    }
    bass(b + 0.5, 0.42, chord.root + 12 + (beat === 3 ? 12 : 0));
    if (bar >= 2) {
      for (let s = 0; s < 4; s++) {
        const step = beat * 4 + s;
        pluck(b + s * 0.25, chord.arp[step % chord.arp.length], bar === 3 ? 0.07 : 0.085, step % 2 ? 0.45 : -0.45, bar === 3 ? 0.4 + 0.6 * (step / 16) : 1);
      }
    }
  }
}

impact(4, 1);
[4, 4.07, 4.14, 4.21].forEach((b, i) => tick(b + 0.02, 0.12, 1800 + i * 300, -0.3 + i * 0.2));
drop(5.06, 0.28, 900);
bloop(5.06, 84, 0.12);
[6, 6.05, 6.1].forEach((b, i) => {
  whoosh(b - 0.08, 0.12, 0.25, -0.8 + i * 0.8, -0.8 + i * 0.8);
  snare(b + 0.02, 0.35);
});
crash(6, 0.12);
bloop(6.02, 53, 0.25);
riser(7, 8, 0.28);
whoosh(7.2, sec(0.8), 0.4, 0.3, -0.3);
reverseCrash(8, sec(1), 0.2);
crash(8, 0.18);

[6, 7, 8, 9, 10].forEach((at, e) => {
  for (let k = 0; k < 12; k++) {
    const offset = (k / 12) * 0.5;
    wood(at + offset, 0.09 * (1 - k / 14), 900 + rnd() * 900, (e % 2 ? 1 : -1) * (-0.8 + (k / 12) * 1.6));
  }
});
[8.5, 9.5, 10.25].forEach((at) => whoosh(at, 0.14, 0.18, -0.5, 0.5));
for (let k = 0; k < 16; k++) tick(10.5 + k * 0.04, 0.05, 2000 + k * 160, -0.7 + (k / 16) * 1.4);

for (let k = 0; k < 14; k++) drop(12 + rnd() * 1.2, 0.16 + rnd() * 0.08, 500 + rnd() * 900, rnd() * 1.6 - 0.8);
sweep(14.05, sec(0.9), 420, 110, 0.18, (u) => Math.sin(Math.PI * u));
for (let k = 0; k < 6; k++) drop(14.2 + k * 0.12, 0.12, 380 + k * 40, k % 2 ? 0.4 : -0.4);
riser(15, 16, 0.3);
reverseCrash(16, sec(0.9), 0.24);

impact(16, 1);
stab(16, CHORDS.Eb.notes.map((n) => n + 12), 0.05);
kick(17, 0.95);
sweep(17, sec(0.4), 90, 45, 0.25, (u) => 1 - u);
impact(18, 0.7);
glass(18, 0.24);
for (let k = 0; k < 24; k++) tick(18.42 + k * 0.034, 0.05, 1200 * Math.pow(3.5, k / 24), k % 2 ? 0.5 : -0.5);
riser(19, 20, 0.36);
whoosh(19.15, sec(0.85), 0.5, -0.1, 0.1);
reverseCrash(20, sec(1), 0.25);

impact(20, 0.85);
[20.5, 21, 21.5, 22, 22.5, 23].forEach((at, i) => {
  whoosh(at - 0.03, 0.13, 0.28, i % 2 ? 0.7 : -0.7, i % 2 ? -0.2 : 0.2);
  tick(at, 0.1, 2400 + i * 200);
});
for (let k = 0; k < 8; k++) {
  const f = 300 + Math.floor(rnd() * 8) * 110;
  voice(21.5 + k * 0.125, 0.05, (t) => (Math.sin(2 * Math.PI * f * t) > 0 ? 1 : -1) * Math.exp(-t * 60), { gain: 0.035, pan: rnd() - 0.5 });
}
wood(21.97, 0.14, 2600);
wood(22, 0.12, 1800);
wood(23, 0.12, 1500);
reverseCrash(24, sec(0.75), 0.26);
sweep(23.3, sec(0.62), 200, 1600, 0.1, (u) => u * u);

boom(24, 0.7);
sub(24, 0.6, 2);
crash(24, 0.25);
stab(24, CHORDS.Db.notes, 0.035);
pad(24, 2, CHORDS.Db.notes, 0.032, (u) => 500 + 800 * u, 0.6);
pad(26, 1.75, CHORDS.Eb.notes, 0.036, (u) => 1300 + 2200 * u, 0.6);
for (let s = 0; s < 14; s++) {
  pluck(24.5 + s * 0.25, CHORDS[s < 6 ? "Db" : "Eb"].arp[s % 8] + 12, 0.05, s % 2 ? 0.5 : -0.5, 0.3 + (s / 14) * 0.7);
}
riser(25.5, 27.75, 0.34);
sweep(25.75, sec(2), 110, 880, 0.07, (u) => u);
for (let b = 26; b < 27.75; ) {
  const u = (b - 26) / 1.75;
  snare(b, 0.12 + 0.3 * u);
  b += u < 0.45 ? 0.25 : u < 0.8 ? 0.125 : 0.0625;
}

impact(28, 1.1);
stab(28, CHORDS.Fm9.notes.map((n) => n + 12), 0.055);
pad(28, 3.4, CHORDS.Fm9.notes, 0.03, (u) => 1600 - 700 * u, 0.6);
for (let k = 0; k < 18; k++) tick(28.4 + k * 0.045, 0.045, 2400 + rnd() * 1800, rnd() * 1.4 - 0.7);
bloop(28.85, 77, 0.18);
sweep(31.3, sec(0.38), 1800, 160, 0.12, (u) => 1 - u);
bloop(31.64, 65, 0.32);
tick(31.86, 0.1, 1600);

const sidechain = new Float32Array(LENGTH).fill(1);
kicks.forEach((time) => {
  const start = Math.round(time * SR);
  const span = Math.round(0.22 * SR);
  for (let i = 0; i < span && start + i < LENGTH; i++) {
    const g = 0.22 + 0.78 * Math.pow(i / span, 1.4);
    sidechain[start + i] = Math.min(sidechain[start + i], g);
  }
});

const echoDelay = Math.round(sec(0.75) * SR);
const echoTone = [svf(), svf()];
const echoOut = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
for (let i = 0; i < LENGTH; i++) {
  const fromL = i >= echoDelay ? echoOut[1][i - echoDelay] : 0;
  const fromR = i >= echoDelay ? echoOut[0][i - echoDelay] : 0;
  echoOut[0][i] = echoSend[0][i] + echoTone[0](fromL * 0.42, 3500).lp;
  echoOut[1][i] = echoTone[1](fromR * 0.42, 3500).lp;
}

const freeverb = (input: Float32Array, spread: number) => {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0, store: 0 }));
  const allpasses = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0 }));
  const out = new Float32Array(LENGTH);
  for (let n = 0; n < LENGTH; n++) {
    const x = input[n] * 0.015;
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.store = o * 0.75 + c.store * 0.25;
      c.buf[c.i] = x + c.store * 0.86;
      c.i = (c.i + 1) % c.buf.length;
      y += o;
    }
    for (const a of allpasses) {
      const o = a.buf[a.i];
      a.buf[a.i] = y + o * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      y = o - y;
    }
    out[n] = y;
  }
  return out;
};
const mono = new Float32Array(LENGTH);
for (let i = 0; i < LENGTH; i++) mono[i] = verbSend[0][i] + verbSend[1][i];
const wet = [freeverb(mono, 0), freeverb(mono, 23)];

const master = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
let peak = 0;
for (let ch = 0; ch < 2; ch++) {
  for (let i = 0; i < LENGTH; i++) {
    const v = drums[ch][i] + ducked[ch][i] * sidechain[i] + wet[ch][i] * 2.6 + echoOut[ch][i] * 0.5;
    master[ch][i] = Math.tanh(v * 1.1);
    peak = Math.max(peak, Math.abs(master[ch][i]));
  }
}

const fade = Math.round(0.012 * SR);
const normalize = 0.93 / peak;
const data = Buffer.alloc(44 + LENGTH * 4);
data.write("RIFF", 0);
data.writeUInt32LE(36 + LENGTH * 4, 4);
data.write("WAVEfmt ", 8);
data.writeUInt32LE(16, 16);
data.writeUInt16LE(1, 20);
data.writeUInt16LE(2, 22);
data.writeUInt32LE(SR, 24);
data.writeUInt32LE(SR * 4, 28);
data.writeUInt16LE(4, 32);
data.writeUInt16LE(16, 34);
data.write("data", 36);
data.writeUInt32LE(LENGTH * 4, 40);
for (let i = 0; i < LENGTH; i++) {
  const edge = Math.min(1, (LENGTH - 1 - i) / fade);
  for (let ch = 0; ch < 2; ch++) {
    const v = Math.max(-1, Math.min(1, master[ch][i] * normalize * edge));
    data.writeInt16LE(Math.round(v * 32767), 44 + i * 4 + ch * 2);
  }
}
writeFileSync(new URL("../public/music.wav", import.meta.url), data);
console.log(`wrote public/music.wav: ${(LENGTH / SR).toFixed(3)}s, peak ${peak.toFixed(3)}`);
