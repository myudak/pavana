import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import scenario from '../../../../../fixtures/scenario-kubu-raya.json';
import { color, font, s } from '../../theme';
import { clamp, Label, ramp, RiseWords, useSceneFade } from '../kit';
import { Phone, TopBar } from '../ui/Phone';

// Fixture values (demo scenario, 07.00 WIB): PM2.5 33.9 µg/m³ → US AQI 97 "Sedang",
// 24 h exposure potential: 6 h moderate, 13 h high, 6 h moderate (see web DEMO_FACTS).
const PM = scenario.hours.map((h) => h.airQuality.pm25UgM3 ?? 0);
const LEVELS = [...Array(6).fill('m'), ...Array(13).fill('h'), ...Array(6).fill('m')] as (
  'm' | 'h'
)[];
const LEVEL_COLOR = { m: '#fb923c', h: '#f472b6' };

const CALLOUTS = [
  { from: s(2.2), y: 250, title: 'Potensi paparan', body: 'Satu jawaban untuk lokasimu' },
  { from: s(4.4), y: 520, title: 'PM2.5 saat ini', body: '34 µg/m³ · Sedang (US AQI 97)' },
  { from: s(6.6), y: 790, title: 'Puncak pukul 19.00 WIB', body: 'Garis waktu asap 24 jam' },
];

/** 0:48 — the Beranda screen builds itself, with callouts for what each part answers. */
export function S05Beranda({ speed = 1 }: { speed?: number }) {
  const frame = useCurrentFrame() * speed;
  const fade = useSceneFade(10, 10);
  const enter = ramp(frame, 0, 24);
  const rotY = interpolate(frame, [0, s(10)], [-26, -10], clamp);
  const float = Math.sin(frame / 22) * 6;

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        background: 'radial-gradient(ellipse at 35% 50%, #20264a 0%, #07090f 65%)',
      }}
    >
      <AbsoluteFill style={{ perspective: 2200 }}>
        <div
          style={{
            position: 'absolute',
            left: 330,
            top: 40,
            transform: `translateY(${(1 - enter) * 300 + float}px) rotateY(${rotY}deg) rotateX(4deg)`,
            opacity: enter,
          }}
        >
          <Phone>
            <BerandaScreen frame={frame} />
          </Phone>
        </div>
      </AbsoluteFill>

      {CALLOUTS.map((c) => {
        const p = ramp(frame, c.from, c.from + 14);
        return (
          <div
            key={c.title}
            style={{
              position: 'absolute',
              left: 980,
              top: c.y,
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              opacity: p,
            }}
          >
            <div style={{ width: 120 * p, height: 3, background: color.amber, borderRadius: 2 }} />
            <div
              style={{
                transform: `translateX(${(1 - p) * 30}px)`,
                fontFamily: font.heading,
                color: color.ink,
              }}
            >
              <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {c.title}
              </div>
              <div style={{ fontSize: 30, color: '#bfc3d0' }}>{c.body}</div>
            </div>
          </div>
        );
      })}
      <Label>Data demo · skenario Sungai Raya</Label>
    </AbsoluteFill>
  );
}

function BerandaScreen({ frame }: { frame: number }) {
  const card = ramp(frame, s(3.6), s(4.3));
  const pm = Math.round(33.9 * ramp(frame, s(3.8), s(5.2)));
  const line = ramp(frame, s(4), s(5.6));
  const tl = ramp(frame, s(5.8), s(7.6));
  const peak = ramp(frame, s(7.4), s(8));
  const max = Math.max(...PM);
  const pts = PM.map((v, i) => `${(i / (PM.length - 1)) * 170},${60 - (v / max) * 54}`).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar />
      <div style={{ padding: '30px 24px 0' }}>
        <div style={{ fontSize: 20, color: '#bfc3d0', opacity: ramp(frame, 10, 22) }}>
          Apakah asap akan sampai ke sini?
        </div>
        <RiseWords
          text="Potensi paparan asap tinggi"
          from={18}
          stagger={4}
          style={{
            marginTop: 6,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: '-0.03em',
            color: '#f472b6',
          }}
        />
        <div
          style={{ marginTop: 10, fontSize: 18, color: '#bfc3d0', opacity: ramp(frame, 46, 60) }}
        >
          Paling tinggi sekitar pukul 19.00 WIB. Berdasarkan prakiraan PM2.5.
        </div>
      </div>

      <div
        style={{
          margin: '22px 20px 0',
          padding: 20,
          borderRadius: 26,
          background: 'rgba(23,27,46,0.85)',
          border: '1px solid rgba(238,240,244,0.08)',
          opacity: card,
          transform: `translateY(${(1 - card) * 40}px)`,
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: 2, color: '#9ca3af', fontWeight: 700 }}>
          PM2.5 SAAT INI
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div
            style={{
              fontFamily: font.display,
              fontSize: 84,
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pm}
            <span
              style={{ fontFamily: font.heading, fontSize: 20, fontWeight: 500, color: '#9ca3af' }}
            >
              {' '}
              µg/m³
            </span>
          </div>
          <svg width={170} height={64}>
            <polyline
              points={pts}
              fill="none"
              stroke="#f472b6"
              strokeWidth={3}
              strokeDasharray={600}
              strokeDashoffset={600 * (1 - line)}
            />
          </svg>
        </div>
        <div
          style={{
            marginTop: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 99,
            background: 'rgba(250,204,21,0.15)',
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 99, background: '#facc15' }} /> Sedang
          <span style={{ fontWeight: 500, color: '#9ca3af' }}>US AQI 97 · indikatif</span>
        </div>
      </div>

      <div
        style={{
          margin: '18px 20px 0',
          padding: 20,
          borderRadius: 26,
          background: 'rgba(23,27,46,0.85)',
          border: '1px solid rgba(238,240,244,0.08)',
          opacity: ramp(frame, s(5.6), s(6.2)),
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: 2, color: '#9ca3af', fontWeight: 700 }}>
          GARIS WAKTU ASAP · 24 JAM
        </div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
          {LEVELS.map((l, i) => {
            const grow = Math.max(0, Math.min(1, tl * 26 - i));
            const isPeak = i === 12;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${(l === 'h' ? 90 : 55) * grow}%`,
                  borderRadius: 4,
                  background: LEVEL_COLOR[l],
                  boxShadow: isPeak && peak > 0 ? `0 0 ${18 * peak}px #f472b6` : undefined,
                  outline: isPeak && peak > 0 ? `2px solid rgba(255,255,255,${peak})` : undefined,
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 14,
            color: '#9ca3af',
          }}
        >
          <span>07.00</span>
          <span style={{ color: '#f472b6', fontWeight: 700, opacity: peak }}>puncak 19.00</span>
          <span>07.00</span>
        </div>
      </div>
    </div>
  );
}
