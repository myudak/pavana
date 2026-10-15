import type { ForecastHour } from '@pavana/shared';
import { windFromToFlowBearing } from '@pavana/shared';
import { ArrowUp } from 'lucide-react';
import { AQ_CSS_VAR, AQ_STYLE, categoryOf } from '@/lib/aq';
import { formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

function WindCell({ ms, fromDeg }: { ms: number | null; fromDeg: number | null }) {
  const t = useCopy();
  if (ms === null || fromDeg === null || !Number.isFinite(ms)) {
    return <span className="text-sm text-ink-muted">-</span>;
  }
  const kmh = Math.round(ms * 3.6);
  return (
    <span className="flex items-center gap-0.5 whitespace-nowrap text-xs text-ink-muted sm:gap-1 sm:text-sm">
      <ArrowUp
        className="size-3.5"
        aria-hidden
        style={{ transform: `rotate(${windFromToFlowBearing(fromDeg)}deg)` }}
      />
      {kmh} km/jam
      <span className="sr-only">{t.today.unit}</span>
    </span>
  );
}

/**
 * `strip` = the 6-hour glass strip on the Today first screen (hour, category
 * dot, PM2.5, wind). Default = the older spaced-out 24h timeline (no wind),
 * still used in the below-fold section.
 */
export function HourlyTimeline({
  hours,
  timeZone,
  step = 3,
  variant = 'default',
}: {
  hours: ForecastHour[];
  timeZone: string;
  step?: number;
  variant?: 'default' | 'strip';
}) {
  const t = useCopy();

  if (variant === 'strip') {
    const slots = hours.slice(0, 6);
    return (
      <ol className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {slots.map((h, i) => {
          const pm = h.airQuality.pm25UgM3;
          const cat = categoryOf(pm);
          return (
            <li
              key={h.validAt}
              className={cn(
                'flex min-w-[104px] flex-1 snap-start flex-col items-center gap-1 rounded-2xl border border-glass-border bg-glass-hero px-2 py-2 text-center backdrop-blur-xl dark:[box-shadow:var(--pv-shadow-soft)] sm:min-w-0',
                i === 0 &&
                  'border-accent/55 bg-accent/[0.16] font-bold dark:[box-shadow:var(--pv-glow-accent)]',
              )}
            >
              <span className={cn('text-[13px]', i === 0 ? 'font-bold' : 'text-ink-muted')}>
                {i === 0 ? t.today.now : formatTime(h.validAt, timeZone)}
              </span>
              <span
                className={cn('size-4 rounded-full', AQ_STYLE[cat].dot)}
                style={{ boxShadow: `0 0 12px var(${AQ_CSS_VAR[cat]})` }}
                aria-hidden
              />
              <span className="text-lg font-semibold tabular-nums">{formatNumber(pm)}</span>
              <WindCell
                ms={h.weather?.windSpeedMs ?? null}
                fromDeg={h.weather?.windDirectionFromDeg ?? null}
              />
              <span className="sr-only">
                {t.aqCategory[cat]}, {t.today.unit}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  const slots = hours.filter((_, i) => i % step === 0);
  return (
    <ol className="-mx-1 flex snap-x gap-1 overflow-x-auto pb-1">
      {slots.map((h, i) => {
        const pm = h.airQuality.pm25UgM3;
        const cat = categoryOf(pm);
        return (
          <li
            key={h.validAt}
            className={cn(
              'flex min-w-16 snap-start flex-col items-center gap-2 rounded-2xl border px-2 py-2 text-sm',
              i === 0
                ? 'border-accent/50 bg-surface dark:[box-shadow:var(--pv-glow-accent)]'
                : 'border-transparent bg-surface/60',
            )}
          >
            <span className="text-xs text-ink-muted">
              {i === 0 ? t.today.now : formatTime(h.validAt, timeZone)}
            </span>
            <span className={cn('size-3 rounded-full', AQ_STYLE[cat].dot)} aria-hidden />
            <span className="font-semibold tabular-nums">{formatNumber(pm)}</span>
            <span className="sr-only">
              {t.today.unit}, {t.aqCategory[cat]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
