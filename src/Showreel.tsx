import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import { CameraMotionBlur } from "@remotion/motion-blur";
import { C } from "./theme";
import { FRAMES_PER_BEAT, IMPACTS } from "./timeline";
import { ease, hash, lerp, useBeat } from "./lib/motion";
import { Hud } from "./components/Hud";
import { Grain } from "./components/Grain";
import { Bounce } from "./scenes/Bounce";
import { KineticType, diveAt } from "./scenes/KineticType";
import { Grid } from "./scenes/Grid";
import { Liquid } from "./scenes/Liquid";
import { Orb3D } from "./scenes/Orb3D";
import { Montage } from "./scenes/Montage";
import { Particles } from "./scenes/Particles";
import { EndCard } from "./scenes/EndCard";

const shakeAt = (frame: number) => {
  const b = frame / FRAMES_PER_BEAT;
  let x = 0;
  let y = 0;
  for (const at of IMPACTS) {
    if (b < at) continue;
    const k = Math.exp(-(b - at) / 0.1) * 16;
    x += (hash(frame * 3.1 + at) * 2 - 1) * k;
    y += (hash(frame * 5.7 + at * 2) * 2 - 1) * k;
  }
  return { x, y };
};

const BLUR_WINDOWS: [number, number][] = [
  [3.4, 4],
  [4.9, 5.35],
  [5.95, 6.55],
  [7.35, 8],
  ...[20.5, 21, 21.5, 22, 22.5, 23].map((at): [number, number] => [at, at + 0.25]),
  [23.3, 24],
  [31.3, 31.72],
];

const DiveCamera = ({ children }: { children: React.ReactNode }) => {
  const b = useBeat();
  if (b >= 8) return <AbsoluteFill>{children}</AbsoluteFill>;
  const dive = diveAt(b);
  const scale = lerp(0.3, 1, ease.inCubic(dive.p));
  return <AbsoluteFill style={{ transform: `translate(${dive.x - 960}px, ${dive.y - 540}px) scale(${scale})` }}>{children}</AbsoluteFill>;
};

export const Showreel = () => {
  const frame = useCurrentFrame();
  const b = frame / FRAMES_PER_BEAT;
  const shake = shakeAt(frame);
  const scenes = (
    <>
      {b < 4 && <Bounce />}
      {b >= 6 && b < 12 && (
        <DiveCamera>
          <Grid />
        </DiveCamera>
      )}
      {b >= 4 && b < 8 && <KineticType />}
      {b >= 12 && b < 16 && <Liquid />}
      {b >= 16 && b < 20 && <Orb3D />}
      {b >= 20 && b < 24 && <Montage />}
      {b >= 24 && b < 28 && <Particles />}
      {b >= 28 && <EndCard />}
    </>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        {BLUR_WINDOWS.some(([from, to]) => b >= from && b < to) ? (
          <CameraMotionBlur samples={8} shutterAngle={200}>
            {scenes}
          </CameraMotionBlur>
        ) : (
          scenes
        )}
      </AbsoluteFill>
      <Hud />
      <Grain />
      <Audio src={staticFile("music.wav")} />
    </AbsoluteFill>
  );
};
