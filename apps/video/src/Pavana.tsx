import dusk from '@pavana/brand/backgrounds/dusk.webp';
import { AbsoluteFill, Img, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { FontGate } from './components/FontGate';
import { HazeBackground } from './components/HazeBackground';
import { Bridge, BRIDGE_DURATION } from './scenes/Bridge';
import { Close, CLOSE_DURATION } from './scenes/Close';
import { COLD_OPEN_DURATION, ColdOpen } from './scenes/ColdOpen';
import { Demo, DEMO_DURATION } from './scenes/Demo';
import { GUESS_MAP_DURATION, GuessMap } from './scenes/GuessMap';
import { Principles, PRINCIPLES_DURATION } from './scenes/Principles';
import { Problem, PROBLEM_DURATION } from './scenes/Problem';

// Scene order follows the storyboard in docs/video/sources.md (2:00 total).
const SCENES = [
  { id: 'cold-open', duration: COLD_OPEN_DURATION, Component: ColdOpen },
  { id: 'problem', duration: PROBLEM_DURATION, Component: Problem },
  { id: 'guess-map', duration: GUESS_MAP_DURATION, Component: GuessMap },
  { id: 'bridge', duration: BRIDGE_DURATION, Component: Bridge },
  { id: 'demo', duration: DEMO_DURATION, Component: Demo },
  { id: 'principles', duration: PRINCIPLES_DURATION, Component: Principles },
  { id: 'close', duration: CLOSE_DURATION, Component: Close },
] as const;

type SceneId = (typeof SCENES)[number]['id'];

const START = {} as Record<SceneId, number>;
let cursor = 0;
for (const sc of SCENES) {
  START[sc.id] = cursor;
  cursor += sc.duration;
}
export const TOTAL_DURATION = cursor;

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function Pavana() {
  const frame = useCurrentFrame();
  // Background layers: black → amber haze (problem) → night (map) → Pavana dusk (from the
  // logo reveal to the end).
  const haze =
    interpolate(frame, [START.problem - 40, START.problem + 10], [0, 1], clamp) *
    interpolate(frame, [START['guess-map'] - 10, START['guess-map'] + 12], [1, 0], clamp);
  const push = interpolate(frame, [START.problem, START['guess-map']], [1, 1.08], clamp);
  const duskP = interpolate(frame, [START.bridge + 150, START.bridge + 175], [0, 1], clamp);
  const duskZoom = interpolate(frame, [START.bridge, TOTAL_DURATION], [1.04, 1.14], clamp);

  return (
    <FontGate>
      <AbsoluteFill style={{ background: '#07090f' }}>
        <AbsoluteFill style={{ opacity: haze, transform: `scale(${push})` }}>
          <HazeBackground />
        </AbsoluteFill>
        <AbsoluteFill style={{ opacity: duskP, transform: `scale(${duskZoom})` }}>
          <Img src={dusk} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: 'rgba(7, 9, 15, 0.35)' }} />
        </AbsoluteFill>
        {SCENES.map(({ id, duration, Component }) => (
          <Sequence key={id} name={id} from={START[id]} durationInFrames={duration}>
            <Component />
          </Sequence>
        ))}
      </AbsoluteFill>
    </FontGate>
  );
}
