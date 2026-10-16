import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';
import { Pavi, Wordmark } from '../components/Brand';
import { color, FPS, font, s } from '../theme';

export const CLOSE_DURATION = s(14);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const LOCKUP = s(4.4);

/** 1:46 — the promise, the lockup, and where every quote and number came from. */
export function Close() {
  const frame = useCurrentFrame();
  const l1 = interpolate(frame, [6, 22], [0, 1], clamp);
  const l2 = interpolate(frame, [s(1.6), s(2.1)], [0, 1], clamp);
  const linesOut = interpolate(frame, [LOCKUP - 12, LOCKUP], [0, 1], clamp);
  const pop = spring({ frame: frame - LOCKUP, fps: FPS, config: { damping: 12 } });
  const word = interpolate(frame, [LOCKUP + 8, LOCKUP + 24], [0, 1], clamp);
  const meta = interpolate(frame, [LOCKUP + s(1.4), LOCKUP + s(2)], [0, 1], clamp);
  const credits = interpolate(frame, [LOCKUP + s(2.6), LOCKUP + s(3.2)], [0, 1], clamp);
  const bob = Math.sin((frame / FPS) * 2.2) * 8;
  const fade = interpolate(frame, [CLOSE_DURATION - 24, CLOSE_DURATION], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ color: color.cream, fontFamily: font.heading }}>
      <AbsoluteFill style={{ background: 'rgba(7, 9, 15, 0.45)' }} />
      {frame < LOCKUP && (
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1 - linesOut,
            fontSize: 84,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          <div style={{ opacity: l1, transform: `translateY(${(1 - l1) * 24}px)` }}>
            Asap tidak bisa kita hentikan sendiri.
          </div>
          <div
            style={{
              opacity: l2,
              transform: `translateY(${(1 - l2) * 24}px)`,
              color: color.amber,
            }}
          >
            Tapi kita bisa bersiap lebih awal.
          </div>
        </AbsoluteFill>
      )}

      {frame >= LOCKUP && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Pavi pose="joy" size={300} style={{ transform: `translateY(${bob}px) scale(${pop})` }} />
          <div style={{ marginTop: 10, opacity: word, transform: `scale(${0.9 + word * 0.1})` }}>
            <Wordmark size={190} />
          </div>
          <div
            style={{
              marginTop: 26,
              opacity: meta,
              fontSize: 40,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
            }}
          >
            <span>Tahu lebih awal kapan asap datang.</span>
            <span
              style={{
                padding: '10px 24px',
                borderRadius: 99,
                background: 'rgba(251, 191, 36, 0.16)',
                border: '1.5px solid rgba(251, 191, 36, 0.55)',
                color: color.amber,
              }}
            >
              pavana.myudak.com
            </span>
          </div>
        </AbsoluteFill>
      )}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 48,
          textAlign: 'center',
          fontSize: 22,
          lineHeight: 1.6,
          color: 'rgba(245, 241, 235, 0.7)',
          opacity: credits,
        }}
      >
        Prototipe · angka aplikasi dalam video ini adalah data demo (skenario Sungai Raya, Kubu
        Raya).
        <br />
        Kutipan: Tirto.id, Liputan6.com, r/indonesia · Data ISPA: Kementerian Kesehatan via Tirto.id
      </div>
      <AbsoluteFill style={{ background: '#000', opacity: fade }} />
    </AbsoluteFill>
  );
}
