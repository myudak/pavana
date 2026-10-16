import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { REDDIT } from '../../data/quotes';
import { color, font, s } from '../../theme';
import { clamp, Label, ramp, RiseWords, useSceneFade } from '../kit';
import { MapStage, T_RANGE } from '../map/MapStage';
import { project } from '../map/projection';

const ARROWS = Array.from({ length: 34 }, (_, i) => ({
  lon: 109.6 + random(`ax${i}`) * 8.4,
  lat: -3.2 + random(`ay${i}`) * 7.6,
  seed: i,
}));
const BUBBLES = [
  { q: REDDIT[0], x: 1180, y: 150, rot: -2 },
  { q: REDDIT[1], x: 1260, y: 340, rot: 1.5 },
];
const DETECT_FROM = s(6.2);
const DETECT_TO = s(10.2);
const QUESTION = s(10.6);

/** 0:12 — the data exists but is scattered: detections everywhere, wind guessed, people asking. */
export function S02Problem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const fade = useSceneFade(12, 12);
  const zoom = interpolate(frame, [0, s(16)], [1.0, 1.1], clamp);
  const q = ramp(frame, QUESTION - 6, QUESTION + 10);

  return (
    <AbsoluteFill style={{ opacity: fade, background: '#07090f' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '45% 55%' }}>
        <MapStage
          view="borneo"
          t={t}
          hotspots={interpolate(frame, [DETECT_FROM, DETECT_TO], [0.02, 1], clamp)}
          byTime
          dim={0.25 + q * 0.4}
        />
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          {ARROWS.map((a) => {
            const [x, y] = project('borneo', a.lon, a.lat);
            const ang =
              random(`aa${a.seed}`) * 360 +
              Math.sin(t * (1.1 + random(`ab${a.seed}`)) + a.seed) * 160;
            const show =
              ramp(frame, s(2.4) + a.seed * 1.2, s(2.4) + a.seed * 1.2 + 10) * (1 - q * 0.8);
            return (
              <g key={a.seed} transform={`translate(${x} ${y}) rotate(${ang})`} opacity={show}>
                <line
                  x1={-26}
                  y1={0}
                  x2={22}
                  y2={0}
                  stroke="#eef0f4"
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <path d="M 30 0 L 16 -9 L 16 9 Z" fill="#eef0f4" />
              </g>
            );
          })}
        </svg>
      </AbsoluteFill>

      {BUBBLES.map(({ q: b, x, y, rot }, i) => {
        const from = s(1.2 + i * 1.8);
        const p = ramp(frame, from, from + 14);
        if (frame < from) return null;
        const place = 'place' in b ? ` · ${b.place}` : '';
        return (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: 620,
              padding: '20px 26px',
              borderRadius: 26,
              borderTopLeftRadius: 6,
              background: 'rgba(23, 27, 46, 0.92)',
              border: '1.5px solid rgba(238,240,244,0.12)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              color: color.ink,
              fontFamily: font.heading,
              opacity: p * (1 - ramp(frame, DETECT_FROM - 6, DETECT_FROM + 8)),
              transform: `translateX(${(1 - p) * 160}px) rotate(${rot * p}deg) scale(${0.9 + 0.1 * p})`,
            }}
          >
            <div style={{ fontSize: 20, color: '#9ca3af' }}>
              <b style={{ color: color.ink }}>warganet</b> · r/indonesia{place} · {b.date}
            </div>
            <div style={{ marginTop: 8, fontSize: 30, fontWeight: 600, lineHeight: 1.3 }}>
              “{b.text}”
            </div>
          </div>
        );
      })}

      {frame >= QUESTION - 6 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <RiseWords
            text="Tersebar, teknis, sulit dipantau sejak dini."
            from={QUESTION}
            stagger={4}
            accent={['sejak', 'dini']}
            style={{
              justifyContent: 'center',
              width: 1500,
              fontFamily: font.heading,
              fontWeight: 800,
              fontSize: 104,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: color.cream,
            }}
          />
        </AbsoluteFill>
      )}
      {frame >= DETECT_FROM - 6 && frame < QUESTION && (
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 120,
            fontFamily: font.heading,
            color: color.ink,
            opacity: ramp(frame, DETECT_FROM - 6, DETECT_FROM + 6),
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, color: '#bfc3d0' }}>
            Deteksi titik panas satelit
          </div>
          <div
            style={{
              fontFamily: font.display,
              fontSize: 84,
              fontWeight: 800,
              color: color.amber,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {new Date(
              T_RANGE[0] +
                (T_RANGE[1] - T_RANGE[0]) *
                  interpolate(frame, [DETECT_FROM, DETECT_TO], [0, 1], clamp),
            ).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              timeZone: 'Asia/Pontianak',
            })}
          </div>
        </div>
      )}
      <Label>Titik panas: data demo · panah angin: ilustrasi</Label>
    </AbsoluteFill>
  );
}
