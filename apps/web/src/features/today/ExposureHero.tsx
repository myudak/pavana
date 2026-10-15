import type { ConditionsResponse, ExposureResponse } from '@pavana/shared';
import { AqCategoryPill } from '@/components/AqCategoryPill';
import { DemoPill } from '@/components/DemoBanner';
import { ProvenanceNote } from '@/components/ProvenanceNote';
import { LocationPicker } from '@/features/location/LocationPicker';
import { categoryOf } from '@/lib/aq';
import { EXP_STYLE } from '@/lib/exposure';
import { formatNumber, formatTime, tzAbbr } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';

/** The headline answer to "Will the smoke reach me?" plus the current PM2.5 card. */
export function ExposureHero({
  conditions: c,
  exposure: e,
}: {
  conditions: ConditionsResponse;
  exposure: ExposureResponse | undefined;
}) {
  const t = useCopy();
  const tz = c.location.timezone;
  const peak = e?.summary.peakLevel ?? 'unknown';
  const peakHour = e?.hours.find((h) => h.validAt === e.summary.peakAt);
  const cat = categoryOf(c.airQuality.pm25UgM3);
  const pm = c.airQuality.pm25UgM3;

  return (
    <section className="space-y-5 pb-2 pt-4 sm:pt-8">
      <div className="flex items-center justify-between gap-2">
        <LocationPicker subtitle={c.location.admin2?.replace('Kabupaten ', '')} />
        {c.state === 'demo' && <DemoPill />}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground/80 drop-shadow-sm">
          {t.exposure.eyebrow}
        </p>
        <h1 className="max-w-xl font-heading text-[2.6rem] font-bold leading-[1.02] tracking-tight drop-shadow-sm sm:text-6xl">
          <span className="bg-gradient-to-r from-haze via-[color-mix(in_oklab,var(--pv-accent),var(--pv-primary-strong))] to-primary-strong bg-clip-text text-transparent">
            {t.exposure.headline[peak]}
          </span>
        </h1>
        {e && peak !== 'unknown' && (
          <p className="max-w-md text-[15px] leading-relaxed text-foreground/85 drop-shadow-sm">
            {e.summary.peakAt &&
              `${t.exposure.peakAt(`${formatTime(e.summary.peakAt, tz)} ${tzAbbr(tz)}`)}. `}
            {peakHour && t.exposure.driver[peakHour.driver]}
          </p>
        )}
      </div>

      <div className="glass relative overflow-hidden rounded-3xl p-4 sm:p-5">
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -right-10 -top-16 size-48 rounded-full blur-3xl',
            EXP_STYLE[peak].soft,
          )}
        />
        <div className="relative flex items-end justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t.today.currentTitle}
            </p>
            {pm === null ? (
              <p className="py-2 text-muted-foreground">{t.today.noData}</p>
            ) : (
              <p className="flex items-baseline gap-1.5">
                <span className="tabular font-heading text-6xl font-bold leading-none tracking-tight">
                  {formatNumber(pm)}
                </span>
                <span className="text-sm text-muted-foreground">{t.today.unit}</span>
              </p>
            )}
          </div>
          {e && (
            <Sparkline
              values={e.hours.slice(0, 13).map((h) => h.pm25UgM3)}
              className="h-16 w-32 shrink-0 sm:w-44"
            />
          )}
        </div>
        <div className="relative mt-3 flex flex-wrap items-center gap-2">
          <AqCategoryPill category={cat} />
          {c.airQuality.aqi && (
            <span className="text-xs text-muted-foreground" title={t.aqiIndicative}>
              US AQI {c.airQuality.aqi.value} · {t.aqiIndicativeShort}
            </span>
          )}
        </div>
        <ProvenanceNote
          provenance={c.airQuality.provenance}
          timeZone={tz}
          className="relative mt-3"
        />
      </div>
    </section>
  );
}
