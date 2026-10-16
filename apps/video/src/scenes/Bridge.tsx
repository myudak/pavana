import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';
import { Pavi, Wordmark } from '../components/Brand';
import { QuoteCard } from '../components/QuoteCard';
import { QUOTES } from '../data/quotes';
import { color, FPS, font, s } from '../theme';

export const BRIDGE_DURATION = s(8);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ASK_FROM = s(3.7);
const LOGO_FROM = s(5.3);
const ASK = ['Bagaimana', 'kalau', 'tidak', 'perlu', 'menebak?'];

/** 0:42 — BMKG on why smoke lingers, the question, then Pavi and the wordmark. */
export function Bridge() {
  const frame = useCurrentFrame();
  const cardExit = interpolate(frame, [ASK_FROM - 10, ASK_FROM], [0, 1], clamp);
  const askUp = interpolate(frame, [LOGO_FROM - 4, LOGO_FROM + 14], [0, 1], clamp);
  const pop = spring({ frame: frame - LOGO_FROM, fps: FPS, config: { damping: 11, mass: 0.8 } });
  const word = interpolate(frame, [LOGO_FROM + 8, LOGO_FROM + 22], [0, 1], clamp);
  const out = interpolate(frame, [BRIDGE_DURATION - 10, BRIDGE_DURATION], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      {frame < ASK_FROM && (
        <QuoteCard quote={QUOTES.N} local={frame} depth={0} exit={cardExit} pace={0.36} />
      )}

      {frame >= ASK_FROM && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              gap: 26,
              fontFamily: font.heading,
              fontWeight: 800,
              fontSize: 92,
              letterSpacing: '-0.03em',
              color: color.cream,
              transform: `translateY(${-askUp * 330}px) scale(${1 - askUp * 0.45})`,
              opacity: 1 - askUp * 0.15,
            }}
          >
            {ASK.map((w, i) => {
              const p = interpolate(
                frame,
                [ASK_FROM + i * 4, ASK_FROM + i * 4 + 10],
                [0, 1],
                clamp,
              );
              return (
                <span
                  key={w}
                  style={{
                    opacity: p,
                    transform: `translateY(${(1 - p) * 24}px)`,
                    color: i === ASK.length - 1 ? color.amber : undefined,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {frame >= LOGO_FROM && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
            <Pavi pose="wave" size={300} style={{ transform: `scale(${pop})` }} />
            <div style={{ opacity: word, transform: `translateX(${(1 - word) * -30}px)` }}>
              <Wordmark size={170} />
              <div
                style={{
                  marginTop: 18,
                  maxWidth: 680,
                  fontFamily: font.heading,
                  fontWeight: 600,
                  fontSize: 34,
                  lineHeight: 1.3,
                  color: 'rgba(245, 241, 235, 0.85)',
                }}
              >
                Prakiraan kualitas udara &amp; potensi dampak asap, berdasarkan lokasimu.
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
