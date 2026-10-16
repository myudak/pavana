import type { ExposureHour } from '@pavana/shared';
import { useId } from 'react';
import { WindArrow } from '@/components/WindArrow';
import { EXP_STYLE } from '@/lib/exposure';
import { formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { msToKmh, windSummary } from '@/lib/wind';

const COL = 60; // px per hour column
const LINE_TOP = 26; // headroom for value labels
const LINE_H = 46;

/**
 * Swipeable 24-hour strip in the style of a phone weather app: PM2.5 line with
 * values on top, exposure dot, wind arrow + km/j, time. Null PM2.5 breaks the line.
 */
export function HourlyStrip({ hours, timeZone }: { hours: ExposureHour[]; timeZone: string }) {
  const t = useCopy();
  const gid = useId();
  const values = hours.map((h) => h.pm25UgM3);
  const nums = values.filter((v): v is number => v !== null);
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;
  const y = (v: number) =>
    LINE_TOP + (max === min ? LINE_H / 2 : (1 - (v - min) / (max - min)) * LINE_H);
  const x = (i: number) => i * COL + COL / 2;
  const width = hours.length * COL;

  let d = '';
  values.forEach((v, i) => {
    if (v === null) return;
    d += `${i > 0 && values[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v).toFixed(1)} `;
  });

  return (
    <div
      className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none sm:-mx-5 sm:px-5"
      tabIndex={0}
      aria-label={t.home.hourlyTitle}
    >
      <div className="relative" style={{ width }}>
        <svg width={width} height={LINE_TOP + LINE_H + 8} className="block" aria-hidden>
          <defs>
            <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--pv-primary)" />
              <stop offset="1" stopColor="var(--pv-accent)" />
            </linearGradient>
          </defs>
          <path
            d={d}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {values.map((v, i) =>
            v === null ? null : (
              <g key={i}>
                <circle
                  cx={x(i)}
                  cy={y(v)}
                  r={i === 0 ? 4.5 : 3}
                  fill={i === 0 ? 'var(--pv-ink)' : 'var(--pv-accent)'}
                />
                <text
                  x={x(i)}
                  y={y(v) - 10}
                  textAnchor="middle"
                  className="fill-foreground font-heading text-[13px] font-semibold"
                >
                  {formatNumber(v)}
                </text>
              </g>
            ),
          )}
        </svg>
        <ol className="flex">
          {hours.map((h, i) => {
            const wind = h.windFromDeg === null ? null : windSummary(h.windFromDeg, t);
            return (
              <li
                key={h.validAt}
                className="flex flex-col items-center gap-2 pt-1"
                style={{ width: COL }}
              >
                <span
                  className={cn('size-3 rounded-full', EXP_STYLE[h.level].dot)}
                  title={`${t.exposure.potentialLabel}: ${t.exposure.level[h.level]}`}
                />
                <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                  {wind && <WindArrow toDeg={wind.toDeg} className="size-3 text-foreground/70" />}
                  {h.windSpeedMs === null ? '—' : formatNumber(msToKmh(h.windSpeedMs))}
                </span>
                <span
                  className={cn('text-xs', i === 0 ? 'font-semibold' : 'text-muted-foreground')}
                >
                  {i === 0 ? t.exposure.stepNow : formatTime(h.validAt, timeZone)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>PM2.5 {t.today.unit}</span>
        <span>· {t.tiles.wind} km/j</span>
        <span className="inline-flex items-center gap-1">
          ·{' '}
          {(['none', 'low', 'moderate', 'high'] as const).map((l) => (
            <span key={l} className="inline-flex items-center gap-1 pr-1">
              <span className={cn('size-2 rounded-full', EXP_STYLE[l].dot)} />
              {t.exposure.level[l]}
            </span>
          ))}
        </span>
      </p>
    </div>
  );
}
