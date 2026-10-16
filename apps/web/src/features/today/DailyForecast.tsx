import type { ForecastHour } from '@pavana/shared';
import { ProvenanceChip } from '@/components/ProvenanceChip';
import { formatNumber, tzAbbr } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { summarizeDailyForecast } from './daily-forecast';

export function DailyForecast({
  hours,
  timeZone,
}: {
  hours: readonly ForecastHour[];
  timeZone: string;
}) {
  const t = useCopy();
  const days = summarizeDailyForecast(hours, timeZone);
  const scale = Math.max(1, ...days.map((day) => day.maxPm25 ?? 0));
  const dateFormat = new Intl.DateTimeFormat('id-ID', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (!days.length) return <p className="text-sm text-muted-foreground">{t.dailyForecast.empty}</p>;
  return (
    <div>
      <div className="mb-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{tzAbbr(timeZone)}</span>
        <span>{t.dailyForecast.rangeLabel}</span>
      </div>
      <ul className="divide-y divide-border/60">
        {days.map((day) => (
          <li
            key={day.date}
            className="grid grid-cols-[6rem_1fr] items-center gap-3 py-3 sm:grid-cols-[8rem_1fr]"
          >
            <div>
              <p className="text-sm font-medium">{dateFormat.format(new Date(day.firstAt))}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t.dailyForecast.coverage(day.availableHours)}
                {day.availableHours < 24 && ` · ${t.dailyForecast.partial}`}
              </p>
            </div>
            {day.minPm25 === null || day.maxPm25 === null ? (
              <span className="text-right text-xs text-muted-foreground">
                {t.dailyForecast.empty}
              </span>
            ) : (
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 tabular-nums">
                <span className="text-right text-sm text-muted-foreground">
                  {formatNumber(day.minPm25)}
                </span>
                <div className="relative h-2 rounded-full bg-foreground/10" aria-hidden>
                  <div
                    className="absolute h-full rounded-full bg-primary"
                    style={{
                      left: `${Math.min(98, (day.minPm25 / scale) * 98)}%`,
                      width: `${Math.max(2, ((day.maxPm25 - day.minPm25) / scale) * 98)}%`,
                    }}
                  />
                </div>
                <span className="text-right text-sm font-semibold">
                  {formatNumber(day.maxPm25)}
                </span>
                <span className="sr-only">{t.dailyForecast.range(day.minPm25, day.maxPm25)}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t.dailyForecast.note}
      </p>
      <div className="mt-2">
        <ProvenanceChip provenance={days[0]!.provenance} timeZone={timeZone} />
      </div>
    </div>
  );
}
