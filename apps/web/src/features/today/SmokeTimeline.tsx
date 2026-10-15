import type { ExposureResponse } from '@pavana/shared';
import { useState } from 'react';
import { WindArrow } from '@/components/WindArrow';
import { Panel } from '@/components/Panel';
import { Slider } from '@/components/ui/slider';
import { EXP_STYLE } from '@/lib/exposure';
import { formatNumber, formatTime, tzAbbr } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { msToKmh, windSummary } from '@/lib/wind';

const STEPS = [0, 3, 6, 12, 24];

/**
 * Scrub through the next hours like a weather app: quick steps (Kini, +3, +6…)
 * plus a slider for any hour. Shows the exposure level, PM2.5 and wind at that hour.
 */
export function SmokeTimeline({
  exposure,
  timeZone,
}: {
  exposure: ExposureResponse;
  timeZone: string;
}) {
  const t = useCopy();
  const hours = exposure.hours;
  const [index, setIndex] = useState(0);
  if (hours.length === 0) return null;

  const steps = STEPS.filter((s) => s < hours.length);
  const h = hours[Math.min(index, hours.length - 1)]!;
  const style = EXP_STYLE[h.level];
  const wind = h.windFromDeg === null ? null : windSummary(h.windFromDeg, t);

  return (
    <Panel title={t.exposure.timelineTitle}>
      <div className="-mx-1 grid grid-cols-5 gap-1.5">
        {steps.map((s) => {
          const step = hours[s]!;
          const active = s === index;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setIndex(s)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 text-center transition-colors',
                active ? 'bg-foreground/10 ring-1 ring-foreground/15' : 'hover:bg-foreground/5',
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {s === 0 ? t.exposure.stepNow : t.exposure.stepHours(s)}
              </span>
              <span
                className={cn(
                  'size-3.5 rounded-full ring-4',
                  EXP_STYLE[step.level].dot,
                  EXP_STYLE[step.level].ring,
                )}
                aria-hidden
              />
              <span className="text-xs font-semibold leading-tight">
                {t.exposure.level[step.level]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        <Slider
          value={[index]}
          min={0}
          max={hours.length - 1}
          step={1}
          onValueChange={([v]) => setIndex(v ?? 0)}
          aria-label={t.exposure.timelineHint}
          className="[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-primary [&_[data-slot=slider-range]]:to-haze"
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t.exposure.stepNow}</span>
          <span>{t.exposure.timelineHint}</span>
          <span>{t.exposure.stepHours(hours.length - 1)}</span>
        </div>
      </div>

      <div
        className={cn('mt-3 grid grid-cols-3 gap-2 rounded-2xl p-3', style.soft)}
        aria-live="polite"
      >
        <div>
          <p className="text-[11px] text-muted-foreground">
            {formatTime(h.validAt, timeZone)} {tzAbbr(timeZone)}
          </p>
          <p className={cn('font-heading text-lg font-bold', style.text)}>
            {t.exposure.level[h.level]}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">PM2.5</p>
          <p className="tabular font-heading text-lg font-bold">
            {formatNumber(h.pm25UgM3)}
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">
              {t.today.unit}
            </span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">{t.tiles.wind}</p>
          {wind && h.windSpeedMs !== null ? (
            <p className="flex items-center gap-1 font-heading text-lg font-bold">
              <WindArrow toDeg={wind.toDeg} className="text-haze" />
              <span className="tabular">{formatNumber(msToKmh(h.windSpeedMs))}</span>
              <span className="text-[11px] font-normal text-muted-foreground">km/j</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {t.exposure.disclaimer}
      </p>
    </Panel>
  );
}
