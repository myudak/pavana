import type { ComponentType } from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile } from 'remotion';
import { FontGate } from '../components/FontGate';
import { FPS } from '../theme';
import { FilmOverlay, Flash } from './fx';
import { clamp } from './kit';
import { S01Hook } from './scenes/S01Hook';
import { S02Problem } from './scenes/S02Problem';
import { S03Reveal } from './scenes/S03Reveal';
import { S06Peta } from './scenes/S06Peta';
import { S07Model } from './scenes/S07Model';
import { S08Chat } from './scenes/S08Chat';
import { S09Alerts } from './scenes/S09Alerts';
import { S10Principles } from './scenes/S10Principles';
import { S11Close } from './scenes/S11Close';
import { SAnswer } from './scenes/SAnswer';
import { SCRIPT, type SceneId } from './script';
import { TimedSubtitles } from './Subtitles';
import timing from './vo-timing.json';

const SCENES: Record<SceneId, ComponentType> = {
  hook: S01Hook,
  problem: S02Problem,
  reveal: S03Reveal,
  peta: S06Peta,
  model: S07Model,
  beranda: SAnswer,
  chat: S08Chat,
  alerts: S09Alerts,
  principles: S10Principles,
  close: S11Close,
};

const f = (sec: number) => Math.round(sec * FPS);
const LEAD = 0.35; // a scene starts this long before its first word
const TAIL = 2.6; // after the last word

/** Scene start frames from the aligned VO (src/v2/vo-timing.json); the last runs to the end. */
const STARTS = SCRIPT.map((_, i) => (i === 0 ? 0 : f(timing.scenes[i]!.start - LEAD)));
export const V2_DURATION = f(timing.scenes.at(-1)!.end + TAIL);
const ENDS = STARTS.map((_, i) => STARTS[i + 1] ?? V2_DURATION);

// Speech spans (frames) for ducking the music under the voice.
const SPEECH = timing.scenes.flatMap((sc) => sc.words.map((w) => [f(w.start), f(w.end)] as const));
const speaking = (frame: number) => SPEECH.some(([a, b]) => frame >= a - 6 && frame <= b + 8);

// Synthesised sound effects (scripts/make-sfx.mjs) at scene cues, in frames.
const SFX: { file: string; at: number; volume: number }[] = [
  { file: 'impact', at: f(2.6), volume: 0.55 },
  { file: 'whoosh', at: STARTS[1]! - 6, volume: 0.35 },
  { file: 'riser', at: STARTS[2]! - f(1.6), volume: 0.4 },
  { file: 'impact', at: STARTS[2]! + 14, volume: 0.5 },
  { file: 'whoosh', at: STARTS[3]! + 4, volume: 0.45 },
  { file: 'sweep', at: STARTS[4]! + 6, volume: 0.35 },
  { file: 'whoosh', at: STARTS[5]! - 6, volume: 0.3 },
  { file: 'pop', at: STARTS[5]! + f(3.9), volume: 0.3 },
  { file: 'pop', at: STARTS[6]! + f(1.25), volume: 0.4 },
  { file: 'pop', at: STARTS[7]! + f(1.2), volume: 0.45 },
  { file: 'impact', at: STARTS[8]! + f(2.1), volume: 0.35 },
  { file: 'impact', at: STARTS[8]! + f(6.3), volume: 0.35 },
  { file: 'impact', at: STARTS[8]! + f(7.5), volume: 0.35 },
  { file: 'riser', at: STARTS[9]! + f(7.0), volume: 0.3 },
  { file: 'impact', at: STARTS[9]! + f(8.6), volume: 0.4 },
];

/** v3 cut: scenes timed to one recorded voice-over, music ducked under speech, SFX at cues. */
export function PavanaV2() {
  return (
    <FontGate>
      <AbsoluteFill style={{ background: '#07090f' }}>
        {SCRIPT.map((sc, i) => {
          const Scene = SCENES[sc.id];
          return (
            <Sequence
              key={sc.id}
              name={sc.id}
              from={STARTS[i]}
              durationInFrames={ENDS[i]! - STARTS[i]!}
            >
              <Scene />
            </Sequence>
          );
        })}
        {STARTS.slice(1).map((st, i) => (
          <Flash key={i} at={st} len={16} />
        ))}
        <FilmOverlay />
        <TimedSubtitles scenes={timing.scenes} />

        <Audio src={staticFile(timing.audio)} />
        <Audio
          src={staticFile('audio/music.mp3')}
          volume={(fr) =>
            (speaking(fr) ? 0.1 : 0.24) *
            interpolate(fr, [0, f(1.5)], [0, 1], clamp) *
            interpolate(fr, [V2_DURATION - f(3), V2_DURATION], [1, 0], clamp)
          }
        />
        {SFX.map((s, i) => (
          <Sequence key={i} from={Math.max(0, s.at)} durationInFrames={f(3)}>
            <Audio src={staticFile(`audio/sfx/${s.file}.wav`)} volume={s.volume} />
          </Sequence>
        ))}
      </AbsoluteFill>
    </FontGate>
  );
}
