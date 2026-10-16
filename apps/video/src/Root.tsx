import { Composition } from 'remotion';
import { Pavana, TOTAL_DURATION } from './Pavana';
import { FPS, HEIGHT, WIDTH } from './theme';
import { PavanaV2, V2_DURATION } from './v2/PavanaV2';

export function Root() {
  return (
    <>
      <Composition
        id="PavanaV2"
        component={PavanaV2}
        durationInFrames={V2_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      {/* First cut (text only, screenshots in a phone). */}
      <Composition
        id="Pavana"
        component={Pavana}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
}
