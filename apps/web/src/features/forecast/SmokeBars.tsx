import { exposureRank, type ExposureHour } from '@pavana/shared';
import { EXP_STYLE } from '@/lib/exposure';
import { formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** One bar per hour, height = exposure level, colour + label per level. Unknown = hatched stub. */
export function SmokeBars({ hours, timeZone }: { hours: ExposureHour[]; timeZone: string }) {
  const t = useCopy();
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label={t.forecast.smokeTitle}>
        {hours.map((h, i) => {
          const rank = exposureRank(h.level);
          const pct = rank < 0 ? 8 : 18 + (rank / 3) * 82;
          return (
            <div
              key={h.validAt}
              title={`${formatTime(h.validAt, timeZone)} · ${t.exposure.level[h.level]}`}
              className={cn(
                'flex-1 rounded-t-md rounded-b-sm transition-opacity',
                EXP_STYLE[h.level].dot,
                rank < 0 && 'opacity-40',
                i === 0 && 'ring-2 ring-foreground/60 ring-offset-2 ring-offset-transparent',
              )}
              style={{ height: `${pct}%` }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        {hours
          .filter((_, i) => i % 6 === 0)
          .map((h, i) => (
            <span key={h.validAt}>{i === 0 ? t.exposure.stepNow : formatTime(h.validAt, timeZone)}</span>
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {(['none', 'low', 'moderate', 'high'] as const).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', EXP_STYLE[l].dot)} />
            {t.exposure.level[l]}
          </span>
        ))}
      </div>
    </div>
  );
}
