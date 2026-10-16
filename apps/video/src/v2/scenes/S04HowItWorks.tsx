import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { color, font, s } from '../../theme';
import { clamp, Glass, ramp, useSceneFade } from '../kit';

const LAYERS = [
  { key: 'pm', title: 'Prakiraan PM2.5', sub: 'Open-Meteo · CAMS', tint: '#818cf8' },
  { key: 'wind', title: 'Arah angin', sub: 'Prakiraan per jam', tint: '#c4b5fd' },
  { key: 'fire', title: 'Titik panas satelit', sub: 'NASA FIRMS · VIIRS', tint: '#ff8c42' },
] as const;
const MERGE = s(6.6);

/** 0:36 — three data layers float in 3D, stack, and collapse into one answer card. */
export function S04HowItWorks() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fade = useSceneFade(10, 10);
  const merge = ramp(frame, MERGE, MERGE + 22);
  const answer = ramp(frame, MERGE + 18, MERGE + 36);
  const spin = interpolate(frame, [0, s(12)], [-18, 8], clamp);

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        background: 'radial-gradient(ellipse at 50% 40%, #1b2140 0%, #07090f 70%)',
      }}
    >
      <AbsoluteFill style={{ perspective: 1800, alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'relative',
            width: 980,
            height: 600,
            transformStyle: 'preserve-3d',
            transform: `rotateX(58deg) rotateZ(${spin}deg)`,
          }}
        >
          {LAYERS.map((l, i) => {
            const enter = ramp(frame, 8 + i * 22, 30 + i * 22);
            const gap = 230 * (1 - merge);
            const z = (i - 1) * gap + (1 - enter) * 400;
            return (
              <div
                key={l.key}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 40,
                  border: `2px solid ${l.tint}`,
                  background: 'rgba(23, 27, 46, 0.55)',
                  boxShadow: `0 0 60px ${l.tint}44`,
                  transform: `translateZ(${z}px)`,
                  opacity: enter * (1 - answer),
                  overflow: 'hidden',
                }}
              >
                <LayerArt kind={l.key} t={t} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* Layer labels, left column. */}
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 300,
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
        }}
      >
        {[...LAYERS].reverse().map((l, i) => {
          const p = ramp(frame, 20 + (2 - i) * 22, 36 + (2 - i) * 22) * (1 - merge);
          return (
            <div
              key={l.key}
              style={{
                opacity: p,
                transform: `translateX(${(1 - p) * -40}px)`,
                fontFamily: font.heading,
                color: color.ink,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  fontSize: 40,
                  fontWeight: 800,
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: 99, background: l.tint }} />
                {l.title}
              </div>
              <div style={{ marginLeft: 32, fontSize: 26, color: '#9ca3af' }}>{l.sub}</div>
            </div>
          );
        })}
      </div>

      {answer > 0 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Glass
            style={{
              padding: '48px 64px',
              width: 980,
              opacity: answer,
              transform: `scale(${0.85 + 0.15 * answer}) translateY(${(1 - answer) * 40}px)`,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 600, color: '#9ca3af' }}>
              Apakah asap akan sampai ke sini?
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 92,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.05,
                background: 'linear-gradient(90deg, #f472b6, #fb923c)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Potensi paparan asap tinggi
            </div>
            <div style={{ marginTop: 14, fontSize: 32, color: color.ink }}>
              Sungai Raya, Kubu Raya · paling tinggi sekitar pukul 19.00 WIB
            </div>
          </Glass>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

function LayerArt({ kind, t }: { kind: 'pm' | 'wind' | 'fire'; t: number }) {
  if (kind === 'pm')
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at ${45 + Math.sin(t * 0.6) * 8}% 55%, rgba(244,114,182,0.75) 0%, rgba(251,146,60,0.45) 30%, rgba(129,140,248,0.15) 60%, transparent 80%)`,
        }}
      />
    );
  if (kind === 'wind')
    return (
      <svg width={980} height={600}>
        {Array.from({ length: 36 }, (_, i) => {
          const y = (i % 9) * 70 + 20;
          const x = ((Math.floor(i / 9) * 260 + t * 90 + random(`lw${i}`) * 200) % 1180) - 100;
          return (
            <line
              key={i}
              x1={x}
              y1={y + 40}
              x2={x - 90}
              y2={y + 80}
              stroke="#c4b5fd"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7}
            />
          );
        })}
      </svg>
    );
  return (
    <svg width={980} height={600}>
      {Array.from({ length: 60 }, (_, i) => {
        const x = 120 + random(`fx${i}`) * 740;
        const y = 80 + random(`fy${i}`) * 440;
        const r = 5 + random(`fr${i}`) * 9;
        const c = ['#ff4b3e', '#ff8c42', '#ffc857'][i % 3]!;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={r * 2.2} fill={c} opacity={0.25} />
            <circle cx={x} cy={y} r={r} fill={c} />
          </g>
        );
      })}
    </svg>
  );
}
