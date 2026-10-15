import { useId, type ReactNode } from 'react';

const START = 135; // degrees, measured clockwise from 12 o'clock … 270° sweep
const SWEEP = 270;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`;
}

/**
 * 270° ring gauge (phone-weather style). `value === null` shows an empty track and
 * no marker — never a fake zero.
 */
export function Gauge({
  value,
  min,
  max,
  stops,
  children,
  size = 88,
}: {
  value: number | null;
  min: number;
  max: number;
  /** Gradient stops along the arc, e.g. ['#4ade80', '#facc15', '#f472b6']. */
  stops: string[];
  children?: ReactNode;
  size?: number;
}) {
  const id = useId();
  const c = 50;
  const r = 40;
  const frac = value === null ? null : Math.min(1, Math.max(0, (value - min) / (max - min)));
  const marker = frac === null ? null : polar(c, c, r, START + frac * SWEEP);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="1" y2="0">
            {stops.map((s, i) => (
              <stop
                key={i}
                offset={stops.length === 1 ? 0 : i / (stops.length - 1)}
                stopColor={s}
              />
            ))}
          </linearGradient>
        </defs>
        <path
          d={arc(c, c, r, START, START + SWEEP)}
          stroke="var(--pv-border)"
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        {frac !== null && (
          <path
            d={arc(c, c, r, START, START + SWEEP)}
            stroke={`url(#${id})`}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            opacity={0.9}
          />
        )}
        {marker && (
          <circle
            cx={marker[0]}
            cy={marker[1]}
            r={6.5}
            fill="var(--pv-surface)"
            stroke="var(--pv-ink)"
            strokeWidth={2.5}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
