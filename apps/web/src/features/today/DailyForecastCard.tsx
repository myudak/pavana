import type { DailyForecastDay } from '@pavana/shared';
import { Calendar, CloudRain } from 'lucide-react';
import { QueryState } from '@/components/QueryState';
import { AQ_STYLE, AQ_CSS_VAR } from '@/lib/aq';
import { weekdayShort } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useDailyForecast } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { panelFill } from './glass';

/** Warm hairline for row separators and the header divider, from the same token
    family as the panel border but more transparent — light: warm orange ~0.18,
    dark: white ~0.10 (same as the panel's dark border). */
const warmHairline = 'border-glass-border/80 dark:border-white/10';
const warmHairlineBg = 'bg-glass-border/80 dark:bg-white/10';

/** PM2.5 band ceiling (µg/m³) → category color token, for the range gradient. */
const BANDS = [
  { max: 9.0, token: '--pv-aq-good' },
  { max: 35.4, token: '--pv-aq-moderate' },
  { max: 55.4, token: '--pv-aq-usg' },
  { max: 125.4, token: '--pv-aq-unhealthy' },
  { max: 225.4, token: '--pv-aq-very-unhealthy' },
  { max: Number.POSITIVE_INFINITY, token: '--pv-aq-hazardous' },
] as const;

function bandToken(pm25: number): string {
  return BANDS.find((b) => pm25 <= b.max)?.token ?? '--pv-aq-hazardous';
}

/** Gradient across the day's min..max range, using the existing category tokens. */
function segmentGradient(min: number, max: number): string {
  const lo = bandToken(min);
  const hi = bandToken(max);
  if (!(max > min)) return `var(${hi})`;
  const inner = [9.0, 35.4, 55.4, 125.4, 225.4]
    .filter((edge) => edge > min && edge < max)
    .map(
      (edge) =>
        `var(${bandToken(edge + 0.01)}) ${(((edge - min) / (max - min)) * 100).toFixed(1)}%`,
    )
    .join(', ');
  const middle = inner ? `, ${inner}` : '';
  const end = `var(${hi})`;
  return `linear-gradient(90deg, var(${lo})${middle}, ${end})`;
}

function DayRow({
  day,
  dayLabel,
  isToday,
  scaleMax,
  nowPm25,
}: {
  day: DailyForecastDay;
  dayLabel: string;
  isToday: boolean;
  scaleMax: number;
  nowPm25: number | null;
}) {
  const t = useCopy();
  if (!day.available || day.pm25Min === null || day.pm25Max === null) {
    return (
      <li
        aria-label={`${dayLabel}: ${t.today.daily.unavailable}`}
        // No row-level opacity on mobile: muted text alone stays ≥3:1 on the
        // card background. Desktop dims unavailable rows per the lg design.
        className={cn(
          'grid h-11 grid-cols-[4.75rem_2.75rem_2rem_minmax(0,1fr)_2.25rem] items-center gap-1 rounded-lg border-t first:border-t-0 lg:h-auto lg:min-h-0 lg:flex-1 lg:grid-cols-[6rem_7rem_2.5rem_minmax(0,1fr)_3rem] lg:opacity-[0.45]',
          warmHairline,
        )}
      >
        <span className="truncate text-[0.9375rem] font-medium text-ink lg:text-base">
          {dayLabel}
        </span>
        <span className="text-center text-sm text-ink-muted" aria-hidden>
          -
        </span>
        <span
          className="text-right text-[0.9375rem] tabular-nums text-ink-muted lg:text-base"
          aria-hidden
        >
          -
        </span>
        <span className="block text-center text-[0.6875rem] text-ink-muted">
          {t.today.daily.unavailable}
        </span>
        <span
          className="text-right text-[0.9375rem] font-bold tabular-nums text-ink lg:text-base"
          aria-hidden
        >
          -
        </span>
      </li>
    );
  }

  const min = Math.round(day.pm25Min);
  const max = Math.round(day.pm25Max);
  const mean = Math.round(day.pm25Mean ?? (day.pm25Min + day.pm25Max) / 2);
  const left = Math.max(0, Math.min(1, day.pm25Min / scaleMax)) * 100;
  const width = Math.max(((day.pm25Max - day.pm25Min) / scaleMax) * 100, 2);
  const nowPos =
    isToday && nowPm25 !== null && Number.isFinite(nowPm25)
      ? Math.max(0, Math.min(1, nowPm25 / scaleMax)) * 100
      : null;

  return (
    <li
      aria-label={t.today.daily.rowLabel(
        dayLabel,
        String(min),
        String(max),
        t.aqCategory[day.category],
      )}
      className={cn(
        'grid h-11 grid-cols-[4.75rem_2.75rem_2rem_minmax(0,1fr)_2.25rem] items-center gap-1 rounded-lg border-t first:border-t-0 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] lg:h-auto lg:min-h-0 lg:flex-1 lg:grid-cols-[6rem_7rem_2.5rem_minmax(0,1fr)_3rem]',
        warmHairline,
        // Desktop "today" marker: thin accent-soft wash bleeding 8px into the
        // card padding, 12px radius.
        isToday && 'lg:-mx-3 lg:rounded-xl lg:bg-accent-soft/70 lg:px-3',
      )}
    >
      <span className="truncate text-[0.9375rem] font-medium text-ink lg:text-base">
        {dayLabel}
      </span>
      <span className="flex flex-col items-center justify-center gap-0.5 lg:flex-row lg:justify-start lg:gap-1.5">
        <span
          className={cn('size-3.5 shrink-0 rounded-full', AQ_STYLE[day.category].dot)}
          style={{ boxShadow: `0 0 10px var(${AQ_CSS_VAR[day.category]})` }}
          aria-hidden
        />
        <span
          className="hidden truncate text-xs text-ink-muted lg:block"
          title={t.aqCategory[day.category]}
        >
          {t.today.daily.catShort[day.category]}
        </span>
        {day.rainProbPct != null && (
          <span className="flex items-center gap-0.5 text-cyan-600 dark:text-cyan-300">
            <CloudRain className="size-3.5 lg:size-3" aria-hidden />
            <span className="text-[0.625rem] tabular-nums">{Math.round(day.rainProbPct)}%</span>
          </span>
        )}
      </span>
      <span className="text-right text-[0.9375rem] tabular-nums text-ink-muted lg:text-base">
        {min}
      </span>
      <span
        className="relative h-1.5 rounded-full bg-primary-strong/10 dark:bg-white/10 lg:h-2"
        title={t.today.daily.barTooltip(String(min), String(mean), String(max))}
        aria-hidden
      >
        <span
          className="absolute top-0 h-full rounded-full"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            minWidth: 6,
            background: segmentGradient(day.pm25Min, day.pm25Max),
          }}
        />
        {nowPos !== null && (
          <span
            className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${nowPos}%` }}
          />
        )}
      </span>
      <span className="text-right text-[0.9375rem] font-bold tabular-nums text-ink lg:text-base">
        {max}
      </span>
    </li>
  );
}

function DailySkeleton() {
  const t = useCopy();
  return (
    <section
      aria-busy
      aria-label={t.today.daily.title}
      className={cn(panelFill, 'relative rounded-card p-3 px-3.5')}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--panel-border)]"
      />
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" aria-hidden />
      <div className={cn('mt-2 border-t', warmHairline)} aria-hidden />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-2" aria-hidden>
          <div className="h-4 w-[4.75rem] animate-pulse rounded bg-surface-muted" />
          <div className="size-3.5 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-4 flex-1 animate-pulse rounded-full bg-surface-muted" />
        </div>
      ))}
    </section>
  );
}

/**
 * 10-day PM2.5 outlook, shared by both breakpoints (only one mounts at a time —
 * a single `useDailyForecast` subscription either way). Mobile renders the
 * compact card; on lg+ the rows stretch to fill the grid column height.
 */
export function DailyForecastCard({
  timeZone,
  nowPm25,
  className,
}: {
  timeZone: string;
  nowPm25: number | null;
  className?: string;
}) {
  const t = useCopy();
  const daily = useDailyForecast(10);

  if (daily.isPending) return <DailySkeleton />;

  return (
    <QueryState query={daily}>
      {(d) => {
        const maxima = d.days.flatMap((x) => (x.pm25Max !== null ? [x.pm25Max] : []));
        const scaleMax =
          maxima.length > 0 ? Math.max(150, Math.ceil(Math.max(...maxima) / 10) * 10) : 150;
        return (
          // panelFill carries background/blur/shadow (no real border classes, so
          // nothing can cancel the outline); the 1px border is the overlay
          // below. twMerge keeps panelFill winning over layout-only classes
          // (no border/background conflicts in either list).
          <section
            aria-label={t.today.daily.title}
            className={cn(
              panelFill,
              'relative rounded-card p-3 px-3.5 lg:flex lg:h-full lg:flex-col lg:p-5',
              className,
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--panel-border)]"
            />
            <div className="overflow-hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-ink-muted" aria-hidden />
                <h2 className="text-[0.6875rem] font-medium tracking-[0.2em] text-ink-muted lg:text-xs">
                  {t.today.daily.title}
                </h2>
                <span className="ml-auto text-[0.6875rem] text-ink-muted lg:text-xs">
                  {t.today.daily.unit}
                </span>
              </div>
              <div className={cn('mb-1 mt-2 h-px', warmHairlineBg)} aria-hidden />
              <ol className="lg:flex lg:flex-1 lg:flex-col">
                {d.days.map((day, i) => (
                  <DayRow
                    key={day.date}
                    day={day}
                    dayLabel={i === 0 ? t.today.daily.today : weekdayShort(day.date, timeZone)}
                    isToday={i === 0}
                    scaleMax={scaleMax}
                    nowPm25={nowPm25}
                  />
                ))}
              </ol>
            </div>
          </section>
        );
      }}
    </QueryState>
  );
}
