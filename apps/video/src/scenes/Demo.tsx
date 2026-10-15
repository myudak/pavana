import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import chat from '../../public/demo/chat.json';
import { DemoBadge, Pavi } from '../components/Brand';
import { color, FPS, font, s } from '../theme';

// Screens are captured from the real app by scripts/capture-demo.mjs (demo mode, dark theme,
// 390×844 at 2×). Everything on them is the fixture scenario, so the badge stays on screen.

export const DEMO_DURATION = s(44);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const SCREEN = { w: 430, h: 931 };
const CSS_SCALE = SCREEN.w / 390;

type Shot = { src: string; from: number; scroll?: boolean };
type Step = {
  from: number;
  n: string;
  title: string;
  body: string;
  chip?: string;
  prototype?: boolean;
};

const STEPS: Step[] = [
  {
    from: 0,
    n: '01',
    title: 'Beranda',
    body: 'Satu jawaban dulu: seberapa besar potensi paparan asap di lokasimu hari ini, lengkap dengan PM2.5 dan garis waktunya.',
  },
  {
    from: s(8),
    n: '02',
    title: 'Peta',
    body: 'Titik panas satelit dan arah angin, untuk melihat dari mana asap bisa datang.',
    chip: 'Titik panas = deteksi satelit, bukan kebakaran pasti',
  },
  {
    from: s(16),
    n: '03',
    title: 'Prakiraan',
    body: 'PM2.5 per jam untuk 24 jam ke depan, dan kapan puncaknya. Di skenario ini: pukul 19.00 WIB.',
  },
  {
    from: s(24),
    n: '04',
    title: 'Tanya Pavi',
    body: 'Tanya dengan bahasa sehari-hari. Pavi mengecek data dulu, lalu menjelaskan dengan sederhana.',
    chip: 'Jawaban contoh · belum memakai model AI',
    prototype: true,
  },
  {
    from: s(38),
    n: '05',
    title: 'Peringatan pintar',
    body: 'Kabar saat potensi asap di lokasimu meningkat. Bukan peringatan resmi.',
    prototype: true,
  },
];

const TAP = s(25.4);
const CHAT_FROM = TAP + 6;

const SHOTS: Shot[] = [
  { src: 'demo/today-1.jpg', from: 0 },
  { src: 'demo/today-2.jpg', from: s(4.4), scroll: true },
  { src: 'demo/map.jpg', from: s(8) },
  { src: 'demo/forecast-1.jpg', from: s(16) },
  { src: 'demo/forecast-2.jpg', from: s(20.2), scroll: true },
  { src: 'demo/chat-welcome.jpg', from: s(24) },
  { src: 'demo/alerts.jpg', from: s(38) },
];

/** 0:50 — the app itself, five screens in a phone, explained on the right. */
export function Demo() {
  const frame = useCurrentFrame();
  const inP = interpolate(frame, [0, 18], [0, 1], clamp);
  const out = interpolate(frame, [DEMO_DURATION - 12, DEMO_DURATION], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <AbsoluteFill style={{ background: 'rgba(7, 9, 15, 0.55)' }} />
      <div style={{ position: 'absolute', top: 56, right: 80, opacity: inP }}>
        <DemoBadge>Data demo · skenario Sungai Raya, Kubu Raya</DemoBadge>
      </div>

      <Phone frame={frame} enter={inP} />

      {STEPS.map((step, i) => (
        <StepText
          key={step.n}
          step={step}
          local={frame - step.from}
          until={(STEPS[i + 1]?.from ?? DEMO_DURATION + 30) - step.from}
        />
      ))}
    </AbsoluteFill>
  );
}

function Phone({ frame, enter }: { frame: number; enter: number }) {
  const current = SHOTS.filter((sh) => frame >= sh.from);
  const inChat = frame >= CHAT_FROM && frame < s(38);
  return (
    <div
      style={{
        position: 'absolute',
        left: 400,
        top: (1080 - SCREEN.h - 28) / 2,
        padding: 14,
        borderRadius: 74,
        background: 'linear-gradient(160deg, #2b3152, #0b0d18 60%)',
        boxShadow: '0 40px 120px rgba(0, 0, 0, 0.6), inset 0 0 0 2px rgba(255,255,255,0.08)',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 80}px) rotate(${(1 - enter) * -4}deg)`,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: SCREEN.w,
          height: SCREEN.h,
          borderRadius: 60,
          overflow: 'hidden',
          background: color.night,
        }}
      >
        {current.slice(-2).map((sh) => {
          const local = frame - sh.from;
          const p = interpolate(local, [0, 14], [0, 1], clamp);
          const ease = 1 - Math.pow(1 - p, 3);
          const transform = sh.scroll
            ? `translateY(${(1 - ease) * 50}%)`
            : `translateX(${(1 - ease) * 30}%)`;
          return (
            <Img
              key={sh.src}
              src={staticFile(sh.src)}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: sh.from === 0 ? 1 : ease,
                transform,
              }}
            />
          );
        })}
        {inChat && <ChatFlipbook local={frame - CHAT_FROM} />}
        {frame >= TAP - 6 && frame < CHAT_FROM + 6 && <Tap local={frame - TAP} />}
      </div>
    </div>
  );
}

/** Replays the screencast of Pavi answering at the speed it was recorded. */
function ChatFlipbook({ local }: { local: number }) {
  const ms = (local / FPS) * 1000;
  let shot = chat.frames[0]!;
  for (const f of chat.frames) if (f.ms <= ms) shot = f;
  return (
    <Img
      src={staticFile(shot.file)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

/** Finger-tap ripple on the "Apakah asap akan sampai ke sini?" chip. */
function Tap({ local }: { local: number }) {
  const ring = interpolate(local, [0, 16], [0, 1], clamp);
  const dot = interpolate(local, [-6, 0, 10, 14], [0, 1, 1, 0], clamp);
  const x = 195 * CSS_SCALE;
  const y = 438 * CSS_SCALE;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: x - 26,
          top: y - 26,
          width: 52,
          height: 52,
          borderRadius: 99,
          background: 'rgba(255, 255, 255, 0.5)',
          opacity: dot,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x - 60,
          top: y - 60,
          width: 120,
          height: 120,
          borderRadius: 99,
          border: '4px solid rgba(255, 255, 255, 0.8)',
          transform: `scale(${0.3 + ring * 0.9})`,
          opacity: (1 - ring) * (local >= 0 ? 1 : 0),
        }}
      />
    </>
  );
}

function StepText({ step, local, until }: { step: Step; local: number; until: number }) {
  if (local < 0 || local > until) return null;
  const inP = interpolate(local, [4, 20], [0, 1], clamp);
  const outP = interpolate(local, [until - 10, until], [0, 1], clamp);
  const chipP = interpolate(local, [24, 38], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 1020,
        top: 300,
        width: 780,
        color: color.cream,
        fontFamily: font.heading,
        opacity: inP * (1 - outP),
        transform: `translateY(${(1 - inP) * 30 - outP * 20}px)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: color.amber }}>{step.n}</span>
        {step.prototype && (
          <span
            style={{
              padding: '6px 16px',
              borderRadius: 99,
              border: `1.5px solid ${color.glassBorder}`,
              fontSize: 20,
              fontWeight: 700,
              color: color.inkMuted,
            }}
          >
            Prototipe
          </span>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          fontSize: 92,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
        }}
      >
        {step.title}
        {step.n === '04' && <Pavi pose="curious" size={96} />}
      </div>
      <div
        style={{
          marginTop: 24,
          fontSize: 38,
          fontWeight: 500,
          lineHeight: 1.38,
          color: 'rgba(245, 241, 235, 0.88)',
        }}
      >
        {step.body}
      </div>
      {step.chip && (
        <div
          style={{
            marginTop: 30,
            display: 'inline-block',
            padding: '12px 22px',
            borderRadius: 16,
            background: 'rgba(251, 191, 36, 0.14)',
            border: '1.5px solid rgba(251, 191, 36, 0.5)',
            color: color.amber,
            fontSize: 26,
            fontWeight: 700,
            opacity: chipP,
          }}
        >
          {step.chip}
        </div>
      )}
    </div>
  );
}
