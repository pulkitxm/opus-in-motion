# opus-in-motion

A 15-second motion design showreel where every frame and every sound is generated from code. There's no editing timeline and no stock audio.

The piece is exactly 32 beats long: 8 bars at 128 BPM, rendered at 1920×1080 and 60fps. Each bar is its own chapter, and each chapter hands off to the next one.

| Bar | Chapter | What happens |
| --- | --- | --- |
| 1 | Principles | A bouncing ball with onion skins, a spacing trail, and squash and stretch. It winds up and launches into the camera. |
| 2 | Kinetic type | "MAKE *it* MOVE" builds as a typographic lockup, then the camera dives through the O. |
| 3 | Geometry | A mirrored Bauhaus tile grid that rotates in waves on the beat, flips, and morphs into circles. |
| 4 | Fluids | The circles turn into glossy metaballs that cluster, orbit, and merge into a sphere. |
| 5 | Three dimensions | A deforming iridescent blob shatters into 720 cubes that form a tunnel the camera flies through. |
| 6 | Layout systems | A panel grid splits from 1 to 9 panels and rearranges into two bento layouts, then collapses into a single point. |
| 7 | Particles | 9,000 particles burst into a spiral galaxy, then converge into the title. |
| 8 | Say hello | End card, followed by a collapse back into the dot the reel started with. |

## How it's made

- [Remotion](https://www.remotion.dev) renders the React scenes frame by frame.
- [Three.js](https://threejs.org) via `@react-three/fiber` handles the 3D chapter.
- SVG filters produce the metaballs, motion smears, and film grain.
- `@remotion/motion-blur` adds motion blur on the fastest moves.
- `scripts/music.ts` is a small synthesizer. It writes the soundtrack (F minor, 128 BPM) as a WAV, with every hit, whoosh, and pop placed on the same beat grid the visuals use.

All timing derives from one place: `src/timeline.ts`.

## Run it

```bash
npm install
npm run music     # synthesize public/music.wav
npm run studio    # scrub the timeline in the browser
npm run render    # synthesize audio and render out/showreel.mp4
```

Requires Node 23.6 or newer, because `scripts/music.ts` runs with Node's built-in TypeScript support.

## Layout

```
src/
  timeline.ts        fps, bpm, chapters, impact beats
  theme.ts           palette and fonts
  Showreel.tsx       scene sequencing, screen shake, motion blur windows
  components/        HUD overlay, grain and vignette
  scenes/            one file per chapter, plus the montage panels
  lib/               easing, springs, seeded randomness, text helpers
scripts/music.ts     the soundtrack synthesizer
```
