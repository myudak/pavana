import { AbsoluteFill, interpolate, Sequence, useCurrentFrame } from 'remotion';
import { FontGate } from './components/FontGate';
import { HazeBackground } from './components/HazeBackground';
import { COLD_OPEN_DURATION, ColdOpen } from './scenes/ColdOpen';
import { Problem, PROBLEM_DURATION } from './scenes/Problem';

// Scene order follows the storyboard in docs/video/sources.md. Built so far: 0:00–0:30.
const SCENES = [
  { id: 'cold-open', duration: COLD_OPEN_DURATION, Component: ColdOpen },
  { id: 'problem', duration: PROBLEM_DURATION, Component: Problem },
];

export const TOTAL_DURATION = SCENES.reduce((sum, sc) => sum + sc.duration, 0);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export function Pavana() {
  const frame = useCurrentFrame();
  // The haze rises at the end of the cold open and slowly pushes in during the problem.
  const haze = interpolate(
    frame,
    [COLD_OPEN_DURATION - 40, COLD_OPEN_DURATION + 10],
    [0, 1],
    clamp,
  );
  const push = interpolate(frame, [COLD_OPEN_DURATION, TOTAL_DURATION], [1, 1.08], clamp);

  let from = 0;
  return (
    <FontGate>
      <AbsoluteFill style={{ background: '#000' }}>
        <AbsoluteFill style={{ opacity: haze, transform: `scale(${push})` }}>
          <HazeBackground />
        </AbsoluteFill>
        {SCENES.map(({ id, duration, Component }) => {
          const start = from;
          from += duration;
          return (
            <Sequence key={id} name={id} from={start} durationInFrames={duration}>
              <Component />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </FontGate>
  );
}
