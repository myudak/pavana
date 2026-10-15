import { interpolate } from 'remotion';
import { color } from '../theme';

type Props = {
  text: string;
  emphasis?: string;
  /** Characters of `text` shown so far (typewriter); omit to show all. */
  shown?: number;
  /** 0 → 1: how far the emphasised phrase has turned amber. */
  highlight?: number;
};

/** Text with one highlighted phrase, optionally revealed character by character. */
export function EmphasisText({ text, emphasis, shown = text.length, highlight = 0 }: Props) {
  const start = emphasis ? text.indexOf(emphasis) : -1;
  const parts =
    start < 0
      ? [{ text, em: false, from: 0 }]
      : [
          { text: text.slice(0, start), em: false, from: 0 },
          { text: emphasis!, em: true, from: start },
          { text: text.slice(start + emphasis!.length), em: false, from: start + emphasis!.length },
        ];

  return (
    <>
      {parts.map((p, i) => {
        const visible = p.text.slice(0, Math.max(0, shown - p.from));
        if (!visible) return null;
        if (!p.em) return <span key={i}>{visible}</span>;
        return (
          <span
            key={i}
            style={{
              color: mix(color.cream, color.amber, highlight),
              textShadow: `0 0 ${interpolate(highlight, [0, 1], [0, 28])}px rgba(251, 191, 36, 0.45)`,
            }}
          >
            {visible}
          </span>
        );
      })}
    </>
  );
}

function mix(a: string, b: string, t: number) {
  const pa = hex(a);
  const pb = hex(b);
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * t));
  return `rgb(${c.join(', ')})`;
}

function hex(h: string) {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
}
