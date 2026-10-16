import { Composition } from 'remotion';
import { Pavana, TOTAL_DURATION } from './Pavana';
import { FPS, HEIGHT, WIDTH } from './theme';
import { calculateV2Metadata, PavanaV2, V2_DEFAULTS } from './v2/PavanaV2';

export function Root() {
  return (
    <>
      <Composition
        id="PavanaV2"
        component={PavanaV2}
        durationInFrames={V2_DEFAULTS.frames.reduce((a, b) => a + b, 0)}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={V2_DEFAULTS}
        calculateMetadata={calculateV2Metadata}
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
