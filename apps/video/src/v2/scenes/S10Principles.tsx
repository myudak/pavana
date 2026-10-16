import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { color, font, s } from '../../theme';
import { ramp, useSceneFade } from '../kit';

const CARDS = [
  { title: 'Titik panas = deteksi', body: 'Deteksi satelit, bukan kebakaran yang pasti.', rot: -4 },
  { title: 'Data kosong ≠ aman', body: 'Yang tidak diketahui ditulis “tidak diketahui”.', rot: 3 },
  {
    title: 'Setiap angka bersumber',
    body: 'NASA FIRMS · Open-Meteo · OpenAQ · BMKG · METAR.',
    rot: -2,
  },
];

/** 1:44 — three honesty principles stamp in. */
export function S10Principles() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useSceneFade(10, 10);

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        background: '#F5A524',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: font.heading,
        color: '#14182B',
      }}
    >
      <div
        style={{
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          opacity: ramp(frame, 0, 14),
          transform: `translateY(${(1 - ramp(frame, 0, 14)) * 30}px)`,
        }}
      >
        Jujur soal data.
      </div>
      <div style={{ marginTop: 70, display: 'flex', gap: 40 }}>
        {CARDS.map((c, i) => {
          const st = spring({
            frame: frame - s([2.0, 6.2, 7.4][i]!),
            fps,
            config: { damping: 9, mass: 0.6 },
          });
          return (
            <div
              key={c.title}
              style={{
                width: 500,
                padding: '40px 40px 44px',
                borderRadius: 32,
                background: '#14182B',
                color: color.cream,
                boxShadow: '0 24px 60px rgba(20,24,43,0.35)',
                opacity: Math.min(1, st * 2),
                transform: `scale(${2.2 - 1.2 * st}) rotate(${c.rot * st}deg)`,
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 800, color: '#F5A524' }}>0{i + 1}</div>
              <div style={{ marginTop: 12, fontSize: 44, fontWeight: 800, lineHeight: 1.12 }}>
                {c.title}
              </div>
              <div style={{ marginTop: 14, fontSize: 28, lineHeight: 1.4, color: '#bfc3d0' }}>
                {c.body}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
