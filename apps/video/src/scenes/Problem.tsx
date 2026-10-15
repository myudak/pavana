import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { QuoteCard, SourcePill } from '../components/QuoteCard';
import { ISPA_STAT, QUOTES, type Quote } from '../data/quotes';
import { color, font, s } from '../theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Beat sheet (frames, relative to the scene start).
const KICKER_SHRINK = s(1.4);
const CARDS: { quote: Quote; from: number }[] = [
  { quote: QUOTES.B, from: s(1.5) },
  { quote: QUOTES.C, from: s(4.8) },
  { quote: QUOTES.F, from: s(9.1) },
];
const CARDS_OUT = s(12.9);
const STAT_FROM = s(13.3);
export const PROBLEM_DURATION = s(19);

/** 0:11 — voices from under the haze, then the health toll in one sourced number. */
export function Problem() {
  const frame = useCurrentFrame();
  const exit = interpolate(frame, [CARDS_OUT, CARDS_OUT + 12], [0, 1], clamp);
  const sceneOut = interpolate(frame, [PROBLEM_DURATION - 15, PROBLEM_DURATION], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ opacity: 1 - sceneOut }}>
      {/* The ISPA figure spans 7 provinces (Kalimantan and Sumatra), so the label leaves first. */}
      <Kicker frame={frame} out={exit} />
      {frame < CARDS_OUT + 14 &&
        CARDS.map(({ quote, from }, i) => {
          if (frame < from) return null;
          const next = CARDS[i + 1];
          const depth = next ? interpolate(frame, [next.from, next.from + 14], [0, 1], clamp) : 0;
          const deeper = CARDS[i + 2];
          const depth2 = deeper
            ? interpolate(frame, [deeper.from, deeper.from + 14], [0, 1], clamp)
            : 0;
          return (
            <QuoteCard
              key={quote.id}
              quote={quote}
              local={frame - from}
              depth={depth + depth2 * 0.4}
              exit={exit}
            />
          );
        })}
      {frame >= STAT_FROM && <Stat local={frame - STAT_FROM} />}
    </AbsoluteFill>
  );
}

/** "Kalimantan, 2026" fills the frame, then shrinks to a corner label. */
function Kicker({ frame, out }: { frame: number; out: number }) {
  const inP = interpolate(frame, [0, 16], [0, 1], clamp);
  const shrink = interpolate(frame, [KICKER_SHRINK, KICKER_SHRINK + 16], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - shrink, 3);
  const scale = interpolate(eased, [0, 1], [1, 0.42]);
  const x = interpolate(eased, [0, 1], [960, 96]);
  const y = interpolate(eased, [0, 1], [540, 88]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(${-50 * (1 - eased)}%, -50%) scale(${scale})`,
        transformOrigin: 'left center',
        opacity: inP * (1 - out),
        color: color.cream,
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          fontFamily: font.heading,
          fontWeight: 800,
          fontSize: 120,
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}
      >
        Kalimantan, 2026
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: font.heading,
          fontWeight: 600,
          fontSize: 44,
          color: color.amber,
          letterSpacing: '0.02em',
        }}
      >
        Suara warga dari balik asap
      </div>
    </div>
  );
}

function Stat({ local }: { local: number }) {
  const inP = interpolate(local, [0, 14], [0, 1], clamp);
  const count = interpolate(local, [4, 40], [0, 1], clamp);
  const eased = 1 - Math.pow(1 - count, 4);
  const value = Math.round(ISPA_STAT.value * eased);
  const label = interpolate(local, [30, 46], [0, 1], clamp);
  const src = interpolate(local, [48, 62], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', color: color.cream }}>
      <div
        style={{
          opacity: inP,
          transform: `scale(${0.94 + inP * 0.06})`,
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 260,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          fontVariantNumeric: 'tabular-nums',
          color: color.amber,
          textShadow: '0 0 60px rgba(251, 191, 36, 0.35)',
        }}
      >
        {value.toLocaleString('id-ID')}
      </div>
      <div
        style={{
          marginTop: 24,
          opacity: label,
          transform: `translateY(${(1 - label) * 14}px)`,
          fontFamily: font.heading,
          fontWeight: 700,
          fontSize: 56,
          textAlign: 'center',
        }}
      >
        {ISPA_STAT.label}
      </div>
      <div
        style={{
          marginTop: 12,
          opacity: label,
          fontFamily: font.heading,
          fontSize: 34,
          color: 'rgba(245, 241, 235, 0.82)',
        }}
      >
        {ISPA_STAT.asOf}
      </div>
      <div style={{ marginTop: 40, opacity: src }}>
        <SourcePill>{ISPA_STAT.source}</SourcePill>
      </div>
    </AbsoluteFill>
  );
}
