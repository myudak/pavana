import { getAudioDurationInSeconds } from '@remotion/media-utils';
import type { ComponentType } from 'react';
import {
  AbsoluteFill,
  Audio,
  type CalculateMetadataFunction,
  Sequence,
  staticFile,
} from 'remotion';
import { FontGate } from '../components/FontGate';
import { FPS } from '../theme';
import { S01Hook } from './scenes/S01Hook';
import { S02Problem } from './scenes/S02Problem';
import { S03Reveal } from './scenes/S03Reveal';
import { S04HowItWorks } from './scenes/S04HowItWorks';
import { S05Beranda } from './scenes/S05Beranda';
import { S06Peta } from './scenes/S06Peta';
import { S07Model } from './scenes/S07Model';
import { S08Chat } from './scenes/S08Chat';
import { S09Alerts } from './scenes/S09Alerts';
import { S10Principles } from './scenes/S10Principles';
import { S11Close } from './scenes/S11Close';
import { SCRIPT, type SceneId } from './script';
import { Subtitles } from './Subtitles';

const SCENES: Record<SceneId, ComponentType> = {
  'vo-01': S01Hook,
  'vo-02': S02Problem,
  'vo-03': S03Reveal,
  'vo-04': S04HowItWorks,
  'vo-05': S05Beranda,
  'vo-06': S06Peta,
  'vo-07': S07Model,
  'vo-08': S08Chat,
  'vo-09': S09Alerts,
  'vo-10': S10Principles,
  'vo-11': S11Close,
};

export interface V2Props extends Record<string, unknown> {
  /** Frames per scene, in SCRIPT order. */
  frames: number[];
  /** Recorded voice-over file per scene (public/vo/…), or null. */
  vo: (string | null)[];
  subtitles: boolean;
}

const planned = SCRIPT.map((sc) => Math.round(sc.seconds * FPS));
export const V2_DEFAULTS: V2Props = {
  frames: planned,
  vo: SCRIPT.map(() => null),
  subtitles: true,
};

/**
 * Stretches a scene to its recording (plus 0.6 s of air) when public/vo/<id>.wav or .mp3
 * exists; otherwise keeps the planned length. Re-render after recording a line.
 */
export const calculateV2Metadata: CalculateMetadataFunction<V2Props> = async ({ props }) => {
  const vo: (string | null)[] = [];
  const frames: number[] = [];
  for (const [i, sc] of SCRIPT.entries()) {
    let file: string | null = null;
    let seconds: number = sc.seconds;
    for (const ext of ['wav', 'mp3']) {
      try {
        const src = staticFile(`vo/${sc.id}.${ext}`);
        const head = await fetch(src, { method: 'HEAD' });
        if (!head.ok) continue;
        const d = await getAudioDurationInSeconds(src);
        file = `vo/${sc.id}.${ext}`;
        seconds = Math.max(sc.seconds * 0.7, d + 0.6);
        break;
      } catch {
        // No recording for this line yet.
      }
    }
    vo.push(file);
    frames.push(Math.round(seconds * FPS) || planned[i]!);
  }
  return {
    durationInFrames: frames.reduce((a, b) => a + b, 0),
    props: { ...props, frames, vo },
  };
};

export function PavanaV2({ frames, vo, subtitles }: V2Props) {
  let from = 0;
  return (
    <FontGate>
      <AbsoluteFill style={{ background: '#07090f' }}>
        {SCRIPT.map((sc, i) => {
          const Scene = SCENES[sc.id];
          const start = from;
          const duration = frames[i] ?? planned[i]!;
          from += duration;
          const file = vo[i];
          return (
            <Sequence key={sc.id} name={sc.id} from={start} durationInFrames={duration}>
              <Scene />
              {file && <Audio src={staticFile(file)} />}
              {subtitles && <Subtitles text={sc.vo} />}
            </Sequence>
          );
        })}
      </AbsoluteFill>
    </FontGate>
  );
}
