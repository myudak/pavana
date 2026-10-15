import { interpolate } from 'remotion';
import type { Quote } from '../data/quotes';
import { color, font } from '../theme';
import { EmphasisText } from './EmphasisText';

type Props = {
  quote: Quote;
  /** Frames since this card started entering. */
  local: number;
  /** 0 = front; 1 = pushed back by the next quote (fractional while animating). */
  depth: number;
  /** 0 → 1 while the whole stack leaves. */
  exit?: number;
  /** Words revealed per frame. */
  pace?: number;
};

const ease = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** Frosted quote card: words appear at reading pace, the key phrase turns amber, older
 *  cards sink back behind newer ones so the voices pile up. */
export function QuoteCard({ quote, local, depth, exit = 0, pace = 0.32 }: Props) {
  const enter = interpolate(local, [0, 14], [0, 1], ease);
  const words = quote.text.split(' ');
  const wordsShown = Math.min(words.length, Math.floor(local * pace) + 1);
  const shown = words.slice(0, wordsShown).join(' ').length;
  const doneAt = words.length / pace;
  const highlight = interpolate(local, [doneAt + 4, doneAt + 22], [0, 1], ease);
  const meta = interpolate(local, [doneAt * 0.6, doneAt * 0.6 + 12], [0, 1], ease);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 1320,
        transform: `translate(-50%, -50%) translateY(${(1 - enter) * 70 - depth * 120 - exit * 40}px) scale(${1 - depth * 0.1})`,
        opacity: enter * (1 - depth * 0.72) * (1 - exit),
        filter: `blur(${depth * 5 + exit * 8}px)`,
        padding: '56px 72px 48px',
        borderRadius: 40,
        background: color.glass,
        border: `1.5px solid ${color.glassBorder}`,
        backdropFilter: 'blur(18px)',
        boxShadow: '0 30px 80px rgba(10, 6, 2, 0.45)',
        color: color.cream,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: -10,
          left: 40,
          fontFamily: font.display,
          fontSize: 180,
          lineHeight: 1,
          color: color.haze,
          opacity: 0.9,
        }}
      >
        “
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: font.heading,
          fontWeight: 600,
          fontSize: 58,
          lineHeight: 1.32,
          letterSpacing: '-0.01em',
          minHeight: 2 * 58 * 1.32,
        }}
      >
        <EmphasisText
          text={quote.text}
          emphasis={quote.emphasis}
          shown={shown}
          highlight={highlight}
        />
      </p>
      <div
        style={{
          marginTop: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          opacity: meta,
          fontFamily: font.heading,
        }}
      >
        <div style={{ fontSize: 30 }}>
          <span style={{ fontWeight: 800 }}>{quote.speaker}</span>
          <span style={{ color: color.inkMuted }}> · {quote.place}</span>
        </div>
        <SourcePill>{quote.source}</SourcePill>
      </div>
    </div>
  );
}

export function SourcePill({ children }: { children: string }) {
  return (
    <span
      style={{
        flexShrink: 0,
        padding: '8px 18px',
        borderRadius: 999,
        border: `1.5px solid ${color.glassBorder}`,
        background: 'rgba(245, 241, 235, 0.06)',
        color: color.inkMuted,
        fontFamily: font.heading,
        fontSize: 22,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
