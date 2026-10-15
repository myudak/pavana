import { useId } from 'react';

/**
 * Tiny trend line (no axes). Null values break the line instead of dropping to 0.
 * The last point gets a glowing dot, like a "now → later" swipe.
 */
export function Sparkline({
  values,
  className,
  width = 160,
  height = 56,
}: {
  values: (number | null)[];
  className?: string;
  width?: number;
  height?: number;
}) {
  const id = useId();
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return null;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pad = 6;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) =>
    max === min ? height / 2 : pad + (1 - (v - min) / (max - min)) * (height - pad * 2);

  let d = '';
  let last: [number, number] | null = null;
  values.forEach((v, i) => {
    if (v === null) return;
    const cmd = i > 0 && values[i - 1] !== null ? 'L' : 'M';
    d += `${cmd}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
    last = [x(i), y(v)];
  });
  const end = last as [number, number] | null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--pv-primary)" />
          <stop offset="1" stopColor="var(--pv-accent)" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {end && (
        <>
          <circle cx={end[0]} cy={end[1]} r={7} fill="var(--pv-accent)" opacity={0.25} />
          <circle cx={end[0]} cy={end[1]} r={4} fill="var(--pv-accent)" />
        </>
      )}
    </svg>
  );
}
