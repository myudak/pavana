import dusk from '@pavana/brand/backgrounds/dusk.webp';
import { AbsoluteFill, Img, interpolate, random, useCurrentFrame } from 'remotion';
import { Pavi } from '../../components/Brand';
import { color, font } from '../../theme';
import { clamp, ramp, RiseWords, useSceneFade, useSpring } from '../kit';

const WORD = 'pavana'.split('');

/** 0:28 — a smoke wipe clears to the Pavana dusk, Pavi pops, the wordmark assembles. */
export function S03Reveal() {
  const frame = useCurrentFrame();
  const fade = useSceneFade(1, 10);
  const wipe = interpolate(frame, [0, 26], [0, 1], clamp);
  const pop = useSpring(14, 9, 0.8);
  const zoom = interpolate(frame, [0, 240], [1.12, 1.02], clamp);

  return (
    <AbsoluteFill style={{ opacity: fade, background: '#07090f' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Img src={dusk} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ background: 'rgba(7, 9, 15, 0.42)' }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Pavi
          pose="wave"
          size={320}
          style={{
            transform: `scale(${pop}) rotate(${(1 - pop) * -18}deg)`,
            filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
          }}
        />
        <div
          style={{
            display: 'flex',
            fontFamily: font.wordmark,
            fontWeight: 700,
            fontSize: 200,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            color: color.cream,
          }}
        >
          {WORD.map((ch, i) => {
            const p = ramp(frame, 26 + i * 3, 40 + i * 3);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 60}px) rotate(${(1 - p) * 12}deg)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <RiseWords
          text="Pantau titik api dan dampaknya, dari lokasimu."
          from={52}
          accent={['titik', 'api']}
          style={{
            justifyContent: 'center',
            marginTop: 18,
            fontFamily: font.heading,
            fontWeight: 600,
            fontSize: 52,
            color: color.cream,
          }}
        />
      </AbsoluteFill>

      {/* Smoke wipe: soft blobs sweep across and clear. */}
      {wipe < 1 &&
        Array.from({ length: 14 }, (_, i) => {
          const y = random(`sy${i}`) * 1080;
          const size = 500 + random(`ss${i}`) * 500;
          const x = -700 + wipe * 3400 - random(`sx${i}`) * 900;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: x,
                top: y - size / 2,
                width: size * 1.6,
                height: size,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(196,140,60,0.9) 0%, rgba(110,63,13,0.6) 45%, transparent 70%)',
                filter: 'blur(40px)',
                opacity: 1 - wipe * 0.4,
              }}
            />
          );
        })}
    </AbsoluteFill>
  );
}
