import { Composition } from 'remotion';
import { Pavana, TOTAL_DURATION } from './Pavana';
import { FPS, HEIGHT, WIDTH } from './theme';

export function Root() {
  return (
    <Composition
      id="Pavana"
      component={Pavana}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}
