import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { color, font, s } from '../theme';

export const PRINCIPLES_DURATION = s(12);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Mirrors the hard rules in AGENTS.md and the providers in apps/api/src/providers.
const CARDS = [
  {
    title: 'Titik panas = deteksi',
    body: 'Titik panas adalah deteksi satelit, bukan kebakaran yang pasti.',
  },
  {
    title: 'Data kosong ≠ aman',
    body: 'Kalau datanya tidak ada, Pavana bilang tidak tahu, bukan "baik".',
  },
  {
    title: 'Sumber terbuka',
    body: 'NASA FIRMS · OpenAQ · Open-Meteo · BMKG, dengan waktu dan sumber di setiap angka.',
  },
];

/** 1:34 — what Pavana will not pretend to know. */
export function Principles() {
  const frame = useCurrentFrame();
  const title = interpolate(frame, [0, 16], [0, 1], clamp);
  const foot = interpolate(frame, [s(4.6), s(5.2)], [0, 1], clamp);
  const out = interpolate(frame, [PRINCIPLES_DURATION - 12, PRINCIPLES_DURATION], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(7, 9, 15, 0.55)',
        opacity: 1 - out,
        color: color.cream,
        fontFamily: font.heading,
      }}
    >
      <div
        style={{
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          opacity: title,
          transform: `translateY(${(1 - title) * 24}px)`,
        }}
      >
        Jujur soal <span style={{ color: color.amber }}>data</span>
      </div>
      <div style={{ display: 'flex', gap: 36, marginTop: 64 }}>
        {CARDS.map((c, i) => {
          const p = interpolate(frame, [s(0.7 + i * 1.1), s(1.2 + i * 1.1)], [0, 1], clamp);
          return (
            <div
              key={c.title}
              style={{
                width: 500,
                minHeight: 300,
                padding: '40px 40px 44px',
                borderRadius: 36,
                background: color.glass,
                border: `1.5px solid ${color.glassBorder}`,
                backdropFilter: 'blur(18px)',
                opacity: p,
                transform: `translateY(${(1 - p) * 50}px)`,
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 800, color: color.amber }}>0{i + 1}</div>
              <div style={{ marginTop: 14, fontSize: 44, fontWeight: 800, lineHeight: 1.15 }}>
                {c.title}
              </div>
              <div
                style={{
                  marginTop: 18,
                  fontSize: 30,
                  lineHeight: 1.4,
                  color: 'rgba(245, 241, 235, 0.85)',
                }}
              >
                {c.body}
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 56,
          fontSize: 32,
          fontWeight: 600,
          color: 'rgba(245, 241, 235, 0.8)',
          opacity: foot,
        }}
      >
        Bukan peringatan resmi: tetap ikuti arahan BMKG, SiPongi, dan pemerintah setempat.
      </div>
    </AbsoluteFill>
  );
}
