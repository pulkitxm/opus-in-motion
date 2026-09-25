import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "./theme";
import { FRAMES_PER_BEAT, IMPACTS } from "./timeline";
import { ease, hash, lerp } from "./lib/motion";
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

const gridCamera = (b: number): React.CSSProperties => {
  const dive = diveAt(b);
  const scale = lerp(0.3, 1, ease.inCubic(dive.p));
  return { transform: `translate(${dive.x - 960}px, ${dive.y - 540}px) scale(${scale})` };
};

export const Showreel = () => {
  const frame = useCurrentFrame();
  const b = frame / FRAMES_PER_BEAT;
  const shake = shakeAt(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        {b < 4 && <Bounce />}
        {b >= 6 && b < 12 && (
          <AbsoluteFill style={b < 8 ? gridCamera(b) : undefined}>
            <Grid />
          </AbsoluteFill>
        )}
        {b >= 4 && b < 8 && <KineticType />}
        {b >= 12 && b < 16 && <Liquid />}
        {b >= 16 && b < 20 && <Orb3D />}
        {b >= 20 && b < 24 && <Montage />}
        {b >= 24 && b < 28 && <Particles />}
        {b >= 28 && <EndCard />}
      </AbsoluteFill>
      <Hud />
      <Grain />
    </AbsoluteFill>
  );
};
