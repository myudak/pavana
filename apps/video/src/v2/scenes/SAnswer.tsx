import { AbsoluteFill, Sequence } from 'remotion';
import { s } from '../../theme';
import { S04HowItWorks } from './S04HowItWorks';
import { S05Beranda } from './S05Beranda';

/** 1:05 — the three layers stack into one answer, then the Beranda screen shows it. */
export function SAnswer() {
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={s(6.8)}>
        <S04HowItWorks mergeAt={3.9} />
      </Sequence>
      <Sequence from={s(6.4)}>
        <S05Beranda speed={1.8} />
      </Sequence>
    </AbsoluteFill>
  );
}
