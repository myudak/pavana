import type { ForecastHour } from '@pavana/shared';
import { AQ_STYLE, categoryOf } from '@/lib/aq';
import { formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Every `step` hours across the series. Value + category label (sr) — never color-only. */
export function HourlyTimeline({
  hours,
  timeZone,
  step = 3,
}: {
  hours: ForecastHour[];
  timeZone: string;
  step?: number;
}) {
  const t = useCopy();
  const slots = hours.filter((_, i) => i % step === 0);
  return (
    <ol className="-mx-1 flex snap-x gap-1 overflow-x-auto pb-1">
      {slots.map((h, i) => {
        const pm = h.airQuality.pm25UgM3;
        const cat = categoryOf(pm);
        return (
          <li
            key={h.validAt}
            className="flex min-w-16 snap-start flex-col items-center gap-2 rounded-xl px-2 py-2 text-sm"
          >
            <span className="text-xs text-ink-muted">
              {i === 0 ? 'Kini' : formatTime(h.validAt, timeZone)}
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
