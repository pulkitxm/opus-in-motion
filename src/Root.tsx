import { Composition } from "remotion";
import { Showreel } from "./Showreel";
import { DURATION_IN_FRAMES, FPS, HEIGHT, WIDTH } from "./timeline";

export const Root = () => (
  <Composition id="Showreel" component={Showreel} durationInFrames={DURATION_IN_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
);
