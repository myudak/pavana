import type { ForecastHour } from '@pavana/shared';
import { windFromToFlowBearing } from '@pavana/shared';
import { ArrowUp } from 'lucide-react';
import { AQ_CSS_VAR, AQ_STYLE, categoryOf } from '@/lib/aq';
import { formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { panelSurface } from './glass';

function WindCell({ ms, fromDeg }: { ms: number | null; fromDeg: number | null }) {
  const t = useCopy();
  if (ms === null || fromDeg === null || !Number.isFinite(ms)) {
    return <span className="text-sm text-ink-muted">-</span>;
  }
  const kmh = Math.round(ms * 3.6);
  return (
    <span className="hidden items-center gap-0.5 whitespace-nowrap text-xs text-ink-muted sm:flex sm:gap-1 sm:text-sm md:text-xs">
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
      <ol
        className={cn(
          panelSurface,
          'grid grid-cols-6 gap-1 overflow-hidden rounded-[1.125rem] p-1.5 [scrollbar-width:none] max-[359px]:flex max-[359px]:snap-x max-[359px]:snap-mandatory max-[359px]:gap-2.5 max-[359px]:overflow-x-auto md:gap-2.5 md:overflow-x-auto md:rounded-none md:border-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-none md:dark:[box-shadow:none] lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden',
        )}
      >
        {slots.map((h, i) => {
          const pm = h.airQuality.pm25UgM3;
          const cat = categoryOf(pm);
          return (
            <li
              key={h.validAt}
              className={cn(
                'relative flex min-h-[clamp(5rem,11svh,6.25rem)] min-w-0 flex-1 snap-start flex-col items-center justify-center gap-1.5 rounded-xl border border-transparent bg-transparent p-2 text-center max-[359px]:min-w-[3.5rem] md:min-h-[5.625rem] md:rounded-2xl md:border-glass-border md:bg-glass-hero md:px-2 md:py-0.5 md:backdrop-blur-xl md:dark:[box-shadow:var(--pv-shadow-soft)] lg:min-h-[clamp(4.125rem,9svh,5.125rem)] [@media((max-width:767px)_and_(max-height:760px))]:p-1',
                i === 0 && 'bg-accent/[0.16] font-bold dark:[box-shadow:var(--pv-glow-accent)]',
              )}
            >
              {i === 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--pv-accent)_55%,transparent)] md:hidden"
                />
              )}
              <span
                className={cn(
                  'text-[0.6875rem] md:text-[0.8125rem]',
                  i === 0 ? 'font-bold' : 'text-ink-muted',
                )}
              >
                {i === 0 ? t.today.now : formatTime(h.validAt, timeZone)}
              </span>
              <span
                className={cn('size-[1.125rem] rounded-full md:size-4', AQ_STYLE[cat].dot)}
                style={{ boxShadow: `0 0 12px var(${AQ_CSS_VAR[cat]})` }}
                aria-hidden
              />
              <span className="text-[0.9375rem] font-bold tabular-nums md:text-base md:font-semibold">
                {formatNumber(pm)}
              </span>
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
