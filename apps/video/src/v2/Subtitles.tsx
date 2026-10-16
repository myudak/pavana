import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { font } from '../theme';
import { clamp } from './kit';

const MAX_CHARS = 64;

/**
 * Splits a line into balanced subtitle chunks of at most ~64 characters: the number of chunks
 * is fixed by the length, then each chunk ends at the break (preferably after punctuation)
 * closest to an equal share.
 */
export function chunk(text: string): string[] {
  const n = Math.ceil(text.length / MAX_CHARS);
  if (n <= 1) return [text];
  const words = text.split(' ');
  const target = text.length / n;
  const out: string[] = [];
  let cur: string[] = [];
  for (const [i, w] of words.entries()) {
    cur.push(w);
    const len = cur.join(' ').length;
    const left = n - out.length - 1;
    const rest = words.slice(i + 1).join(' ').length;
    const punct = /[.,?!:]$/.test(w);
    if (left > 0 && (len >= target * (punct ? 0.75 : 1) || rest <= target * (left - 1) + 8)) {
      out.push(cur.join(' '));
      cur = [];
    }
  }
  if (cur.length) out.push(cur.join(' '));
  return out;
}

/**
 * Burned-in Indonesian subtitles for one scene. Chunks share the scene's speaking time in
 * proportion to their length (lead-in 0.3 s, tail 0.5 s), which also matches a recorded VO
 * closely enough when the scene is stretched to the recording.
 */
export function Subtitles({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const parts = chunk(text);
  const start = Math.round(0.3 * fps);
  const end = durationInFrames - Math.round(0.5 * fps);
  const total = parts.reduce((s, p) => s + p.length, 0);
  let t = start;
  const spans = parts.map((p) => {
    const len = ((end - start) * p.length) / total;
    const span = { text: p, from: t, to: t + len };
    t += len;
    return span;
  });
  const cur = spans.find((s) => frame >= s.from && frame < s.to);
  if (!cur) return null;
  const o =
    interpolate(frame, [cur.from, cur.from + 5], [0, 1], clamp) *
    interpolate(frame, [cur.to - 4, cur.to], [1, 0.2], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 48,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1500,
          padding: '12px 28px',
          borderRadius: 16,
          background: 'rgba(7, 9, 15, 0.72)',
          color: '#F5F1EB',
          fontFamily: font.heading,
          fontWeight: 600,
          fontSize: 38,
          lineHeight: 1.3,
          textAlign: 'center',
          opacity: o,
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {cur.text}
      </div>
    </div>
  );
}
