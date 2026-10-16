// Small motion helpers shared by the v2 scenes.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { CSSProperties, ReactNode } from 'react';
import { color, font } from '../theme';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 → 1 between two frames, eased out (cubic). */
export function ramp(frame: number, from: number, to: number) {
  const t = interpolate(frame, [from, to], [0, 1], clamp);
  return 1 - Math.pow(1 - t, 3);
}

/** Spring from `delay` frames, 0 → 1 (with a little overshoot by default). */
export function useSpring(delay = 0, damping = 12, mass = 0.7) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass } });
}

/** Fades a scene in over `inF` frames and out over the last `outF` frames. */
export function useSceneFade(inF = 10, outF = 10) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    interpolate(frame, [0, inF], [0, 1], clamp) *
    interpolate(frame, [durationInFrames - outF, durationInFrames], [1, 0], clamp)
  );
}

/** Frosted panel in the app's Dusk/Haze look. */
export function Glass({
  children,
  style,
  radius = 32,
}: {
  children?: ReactNode;
  style?: CSSProperties;
  radius?: number;
}) {
  return (
    <div
      style={{
        background: 'rgba(23, 27, 46, 0.88)',
        border: '1.5px solid rgba(238, 240, 244, 0.1)',
        borderRadius: radius,
        boxShadow: '0 30px 80px rgba(2, 6, 23, 0.5)',
        color: color.ink,
        fontFamily: font.heading,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Words that rise in one after another (kinetic type). */
export function RiseWords({
  text,
  from,
  stagger = 3,
  style,
  accent,
}: {
  text: string;
  from: number;
  stagger?: number;
  style?: CSSProperties;
  /** Words (exact match, punctuation stripped) drawn in the accent colour. */
  accent?: string[];
}) {
  const frame = useCurrentFrame();
  const words = text.split(' ');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: '0.28em', ...style }}>
      {words.map((w, i) => {
        const p = ramp(frame, from + i * stagger, from + i * stagger + 12);
        const bare = w.replace(/[.,:;?!]/g, '');
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * 0.5}em)`,
              color: accent?.includes(bare) ? color.amber : undefined,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

/** Counts a number up with Indonesian formatting. */
export function countUp(frame: number, from: number, to: number, value: number, digits = 0) {
  const v = value * ramp(frame, from, to);
  return v.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Small honesty label (demo / eksperimental / prototipe) in a fixed corner. */
export function Label({ children, tone = 'demo' }: { children: string; tone?: 'demo' | 'warn' }) {
  const c = tone === 'demo' ? '#c4b5fd' : color.amber;
  return (
    <div
      style={{
        position: 'absolute',
        top: 52,
        right: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 999,
        background: tone === 'demo' ? 'rgba(167,139,250,0.16)' : 'rgba(251,191,36,0.14)',
        border: `1.5px solid ${tone === 'demo' ? 'rgba(167,139,250,0.45)' : 'rgba(251,191,36,0.5)'}`,
        color: c,
        fontFamily: font.heading,
        fontWeight: 700,
        fontSize: 22,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: c }} />
      {children}
    </div>
  );
}
