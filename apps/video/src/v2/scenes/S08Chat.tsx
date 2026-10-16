import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { Pavi, type Pose } from '../../components/Brand';
import { color, font, s } from '../../theme';
import { clamp, Glass, Label, ramp, useSceneFade } from '../kit';

// Copy mirrors the demo chat (apps/web/src/lib/i18n/id.ts chat.replies.reach, tool names).
const QUESTION = 'Apakah asap akan sampai ke sini?';
const SAY = [
  'Pertanyaan utama! Aku lihat arah angin dan titik panas di sekitarmu dulu.',
  'Angin datang dari tenggara, dan 101 dari 103 deteksi titik panas berada di arah datangnya angin.',
  'Jadi potensi paparan asap di Sungai Raya tinggi hari ini, terutama sekitar pukul 13.00–01.00 WIB, dengan puncak sekitar pukul 19.00. Ini indikator, bukan kepastian — pantau juga kanal resmi.',
];
const T = {
  type: s(0.6),
  send: s(2.0),
  say0: s(2.6),
  tool0: s(4.0),
  tool0done: s(5.0),
  say1: s(5.4),
  tool1: s(6.8),
  tool1done: s(7.8),
  say2: s(8.2),
};
const LEVELS = [...Array(6).fill('m'), ...Array(13).fill('h'), ...Array(6).fill('m')] as (
  'm' | 'h'
)[];

/** 1:22 — Tanya Pavi: the question, two tool checks, then the plain-language answer. */
export function S08Chat({ speed = 1.6 }: { speed?: number }) {
  const frame = useCurrentFrame() * speed;
  const fade = useSceneFade(10, 10);
  const enter = ramp(frame, 0, 18);
  const typed = QUESTION.slice(0, Math.max(0, Math.floor((frame - T.type) * 1.3)));
  const running =
    (frame >= T.tool0 && frame < T.tool0done) || (frame >= T.tool1 && frame < T.tool1done);
  const pose: Pose =
    frame < T.say0 ? 'curious' : running ? 'calm' : frame > T.say2 + 40 ? 'surprised' : 'look';
  // Content grows at the bottom; older messages move up.
  const scroll = interpolate(frame, [T.tool1, T.say2 + 60], [0, 330], clamp);

  return (
    <AbsoluteFill
      style={{
        opacity: fade,
        background: 'radial-gradient(ellipse at 60% 40%, #222851 0%, #07090f 65%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 120,
          top: 200,
          width: 520,
          fontFamily: font.heading,
          color: color.ink,
          opacity: enter,
        }}
      >
        <Pavi
          pose={pose}
          size={300}
          style={{ transform: `translateY(${Math.sin(frame / 14) * 8}px)` }}
        />
        <div style={{ marginTop: 18, fontSize: 64, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Tanya Pavi
        </div>
        <div style={{ fontSize: 30, color: '#bfc3d0', lineHeight: 1.35 }}>
          Cek data dulu, baru menjelaskan.
        </div>
      </div>

      <Glass
        style={{
          position: 'absolute',
          left: 700,
          top: 90,
          width: 1100,
          height: 820,
          overflow: 'hidden',
          opacity: enter,
          transform: `translateY(${(1 - enter) * 60}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 40,
            right: 40,
            top: 30,
            transform: `translateY(${-scroll}px)`,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {frame >= T.send && <Bubble user text={QUESTION} p={ramp(frame, T.send, T.send + 10)} />}
          {frame >= T.say0 && <Stream text={SAY[0]!} from={T.say0} frame={frame} />}
          {frame >= T.tool0 && (
            <Tool
              title="Cek angin"
              done={frame >= T.tool0done}
              p={ramp(frame, T.tool0, T.tool0 + 10)}
              frame={frame}
            >
              <div style={{ fontSize: 26 }}>
                Dari tenggara (134°), 10 km/j — bertiup ke barat laut.
              </div>
            </Tool>
          )}
          {frame >= T.say1 && <Stream text={SAY[1]!} from={T.say1} frame={frame} />}
          {frame >= T.tool1 && (
            <Tool
              title="Apakah asap sampai?"
              done={frame >= T.tool1done}
              p={ramp(frame, T.tool1, T.tool1 + 10)}
              frame={frame}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    padding: '4px 14px',
                    borderRadius: 99,
                    background: '#f472b6',
                    color: '#14182b',
                    fontWeight: 800,
                    fontSize: 20,
                  }}
                >
                  Tinggi
                </span>
                <span style={{ fontSize: 24 }}>Potensi paparan asap tinggi</span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  gap: 3,
                  height: 34,
                  alignItems: 'flex-end',
                }}
              >
                {LEVELS.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: l === 'h' ? '100%' : '60%',
                      borderRadius: 3,
                      background: l === 'h' ? '#f472b6' : '#fb923c',
                    }}
                  />
                ))}
              </div>
            </Tool>
          )}
          {frame >= T.say2 && <Stream text={SAY[2]!} from={T.say2} frame={frame} />}
        </div>

        {/* Composer */}
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 26,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 18px 16px 28px',
            borderRadius: 40,
            background: 'rgba(14,17,32,0.92)',
            border: '1.5px solid rgba(238,240,244,0.12)',
          }}
        >
          <div
            style={{
              flex: 1,
              fontSize: 28,
              color: frame < T.send && typed ? color.ink : '#6b7280',
            }}
          >
            {frame < T.send && typed ? typed : 'Tanya Pavi…'}
            {frame < T.send && typed && <span style={{ color: color.amber }}>|</span>}
          </div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 99,
              background: '#6366f1',
              transform: `scale(${frame >= T.send - 4 && frame < T.send + 6 ? 0.85 : 1})`,
            }}
          />
        </div>
      </Glass>
      <Label>Contoh mode demo · versi live: LLM + data Pavana</Label>
    </AbsoluteFill>
  );
}

function Bubble({ text, p, user }: { text: string; p: number; user?: boolean }) {
  return (
    <div
      style={{
        alignSelf: user ? 'flex-end' : 'flex-start',
        maxWidth: '82%',
        padding: '16px 24px',
        borderRadius: 30,
        borderBottomRightRadius: user ? 8 : 30,
        background: user ? '#6366f1' : 'rgba(238,240,244,0.06)',
        color: '#fff',
        fontSize: 28,
        lineHeight: 1.35,
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px) scale(${0.95 + 0.05 * p})`,
      }}
    >
      {text}
    </div>
  );
}

function Stream({ text, from, frame }: { text: string; from: number; frame: number }) {
  const words = text.split(' ');
  const shown = Math.min(words.length, Math.max(0, Math.floor((frame - from) * 1.1)));
  return (
    <div style={{ maxWidth: '92%', fontSize: 28, lineHeight: 1.4, color: '#eef0f4' }}>
      {words.slice(0, shown).map((w, i) => (
        <span
          key={i}
          style={{
            fontWeight: w === 'tinggi' ? 800 : 400,
            color: w === 'tinggi' ? '#f472b6' : undefined,
          }}
        >
          {w}{' '}
        </span>
      ))}
    </div>
  );
}

function Tool({
  title,
  done,
  p,
  frame,
  children,
}: {
  title: string;
  done: boolean;
  p: number;
  frame: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '18px 24px',
        borderRadius: 22,
        background: 'rgba(14,17,32,0.7)',
        border: '1.5px solid rgba(238,240,244,0.1)',
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 99,
              border: done ? 'none' : '3px solid #818cf8',
              borderTopColor: 'transparent',
              background: done ? '#22c55e' : 'transparent',
              transform: done ? undefined : `rotate(${frame * 18}deg)`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#07090f',
              fontSize: 18,
            }}
          >
            {done ? '✓' : ''}
          </span>
          {title}
        </span>
        <span style={{ fontSize: 20, color: done ? '#22c55e' : '#9ca3af' }}>
          {done ? 'Selesai' : 'Mengecek…'}
        </span>
      </div>
      {done && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}
