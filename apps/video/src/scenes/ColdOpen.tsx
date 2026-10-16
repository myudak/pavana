import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EmphasisText } from '../components/EmphasisText';
import { SourcePill } from '../components/QuoteCard';
import { QUOTES } from '../data/quotes';
import { color, font, s } from '../theme';

export const COLD_OPEN_DURATION = s(8);

const quote = QUOTES.A;
const TYPE_FROM = s(0.4);
const CHARS_PER_FRAME = 1.35; // ~40 chars/s: done in under 4 s, then held to read
const typedAt = TYPE_FROM + quote.text.length / CHARS_PER_FRAME;
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0:00 — black screen, Rani's words typed out. The haze rises behind it at the end
 *  (HazeBackground lives in Opening so it carries into the next scene). */
export function ColdOpen() {
  const frame = useCurrentFrame();
  const shown = Math.max(0, Math.floor((frame - TYPE_FROM) * CHARS_PER_FRAME));
  const typing = shown < quote.text.length;
  const caretOn = typing || Math.floor(frame / 15) % 2 === 0;
  const highlight = interpolate(frame, [typedAt + 6, typedAt + 30], [0, 1], clamp);
  const meta = interpolate(frame, [typedAt + 12, typedAt + 30], [0, 1], clamp);
  const out = interpolate(frame, [COLD_OPEN_DURATION - 24, COLD_OPEN_DURATION], [0, 1], clamp);
  const markIn = interpolate(frame, [0, 18], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 1 - out,
        filter: `blur(${out * 10}px)`,
      }}
    >
      <div style={{ position: 'relative', width: 1440 }}>
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: -24,
            fontFamily: font.display,
            fontSize: 220,
            lineHeight: 1,
            color: color.haze,
            opacity: markIn * 0.85,
          }}
        >
          “
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: font.heading,
            fontWeight: 600,
            fontSize: 68,
            lineHeight: 1.34,
            letterSpacing: '-0.012em',
            color: color.cream,
            minHeight: 4 * 68 * 1.34,
          }}
        >
          <EmphasisText
            text={quote.text}
            emphasis={quote.emphasis}
            shown={shown}
            highlight={highlight}
          />
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 64,
              marginLeft: 6,
              verticalAlign: '-8px',
              background: color.amber,
              opacity: caretOn ? 1 : 0,
            }}
          />
        </p>
        <div
          style={{
            marginTop: 44,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            opacity: meta,
            transform: `translateY(${(1 - meta) * 16}px)`,
            fontFamily: font.heading,
            color: color.cream,
          }}
        >
          <div style={{ fontSize: 32 }}>
            <span style={{ fontWeight: 800 }}>— {quote.speaker}</span>
            <span style={{ color: color.inkMuted }}> · {quote.place}</span>
          </div>
          <SourcePill>{quote.source}</SourcePill>
        </div>
      </div>
    </AbsoluteFill>
  );
}
