import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { EmphasisText } from '../../components/EmphasisText';
import { HazeBackground } from '../../components/HazeBackground';
import { SourcePill } from '../../components/QuoteCard';
import { ISPA_STAT, QUOTES } from '../../data/quotes';
import { color, font, s } from '../../theme';
import { clamp, countUp, ramp, useSceneFade } from '../kit';

const QUOTE_FROM = s(5.2);
const quote = QUOTES.A;
const TYPED_FROM = 'saat asap masuk';
const fragment = quote.text.slice(quote.text.indexOf(TYPED_FROM));

/** 0:00 — the health toll counts up out of the haze, then Rani's question is typed. */
export function S01Hook() {
  const frame = useCurrentFrame();
  const fade = useSceneFade(1, 12);
  const numIn = ramp(frame, 4, 22);
  const numUp = ramp(frame, QUOTE_FROM - 14, QUOTE_FROM + 10);
  const push = interpolate(frame, [0, s(12)], [1.12, 1], clamp);
  const shown = Math.max(0, Math.floor((frame - QUOTE_FROM - 6) * 1.6));
  const typed = shown >= fragment.length;
  const meta = ramp(
    frame,
    QUOTE_FROM + 6 + fragment.length / 1.6,
    QUOTE_FROM + 20 + fragment.length / 1.6,
  );

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <HazeBackground />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${-numUp * 330}px) scale(${1 - numUp * 0.55})`,
          opacity: numIn,
        }}
      >
        <div
          style={{
            fontFamily: font.display,
            fontWeight: 800,
            fontSize: 300,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            color: color.amber,
            textShadow: '0 0 80px rgba(251,191,36,0.45)',
            fontVariantNumeric: 'tabular-nums',
            filter: `blur(${(1 - numIn) * 14}px)`,
          }}
        >
          {countUp(frame, 6, 70, ISPA_STAT.value)}
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: font.heading,
            fontWeight: 700,
            fontSize: 48,
            color: color.cream,
            opacity: ramp(frame, 40, 58),
          }}
        >
          {ISPA_STAT.label}
        </div>
        <div style={{ marginTop: 24, opacity: ramp(frame, 60, 76) * (1 - numUp) }}>
          <SourcePill>{ISPA_STAT.source}</SourcePill>
        </div>
      </AbsoluteFill>

      {frame >= QUOTE_FROM && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
          <div style={{ width: 1500 }}>
            <p
              style={{
                margin: 0,
                fontFamily: font.heading,
                fontWeight: 700,
                fontSize: 76,
                lineHeight: 1.22,
                letterSpacing: '-0.02em',
                color: color.cream,
              }}
            >
              <span style={{ color: color.haze }}>“…</span>
              <EmphasisText
                text={fragment}
                emphasis={quote.emphasis}
                shown={shown}
                highlight={
                  typed
                    ? ramp(
                        frame,
                        QUOTE_FROM + 6 + fragment.length / 1.6,
                        QUOTE_FROM + 30 + fragment.length / 1.6,
                      )
                    : 0
                }
              />
              {typed && <span style={{ color: color.haze }}>”</span>}
            </p>
            <div
              style={{
                marginTop: 32,
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                opacity: meta,
                fontFamily: font.heading,
                fontSize: 30,
                color: color.cream,
              }}
            >
              <b>— {quote.speaker}</b>
              <span style={{ color: color.inkMuted }}>{quote.place}</span>
              <SourcePill>{quote.source}</SourcePill>
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}
