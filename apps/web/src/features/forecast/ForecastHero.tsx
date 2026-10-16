import { Navigation, Wind } from 'lucide-react';
import { Link } from 'react-router';
import type { ConditionsResponse, ExposureResponse, ForecastHour } from '@pavana/shared';
import { Flame } from '@/components/icons';
import { LocationPicker } from '@/features/location/LocationPicker';
import { summarizePm25 } from '@/features/insights/insight-derive';
import { DuskBackdrop, type BackdropTint } from '@/features/today/DuskBackdrop';
import { AQ_STYLE, categoryOf } from '@/lib/aq';
import { EXP_STYLE } from '@/lib/exposure';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { windDirectionLabel } from '@/lib/wind-label';

/**
 * Apple-Weather-style hero for /prakiraan, Pavana smoke edition: full-bleed
 * photo with an ambient exposure tint, centered white text (location,
 * PM2.5, smoke condition, 24h peak/low, hotspot + wind chips, driver line).
 * Read-only: every number comes from the passed queries, null renders "-".
 */
export function ForecastHero({
  conditions,
  exposure,
  hours,
  hotspotCount,
}: {
  conditions: ConditionsResponse;
  exposure: ExposureResponse | undefined;
  hours: readonly ForecastHour[];
  hotspotCount: number | null;
}) {
  const t = useCopy();
  const pm = conditions.airQuality.pm25UgM3;
  const cat = categoryOf(pm);

  const summary = exposure?.summary;
  const peak: ExposureResponse['summary']['peakLevel'] =
    summary && summary.peakLevel !== 'unknown' ? summary.peakLevel : 'unknown';
  const hasExposure = exposure !== undefined && peak !== 'unknown';
  const tint: BackdropTint = hasExposure ? peak : 'unknown';

  const condition = hasExposure
    ? { text: t.exposure.headline[peak], className: EXP_STYLE[peak].text }
    : { text: t.aqCategory[cat], className: AQ_STYLE[cat].text };

  const day = summarizePm25(hours.slice(0, 24));
  const fmt = (v: number) => formatNumber(Math.round(v));
  const range = t.forecast.hero.range(day ? fmt(day.peak.pm25UgM3) : '-', day ? fmt(day.min) : '-');

  const windName = windDirectionLabel(conditions.weather?.windDirectionFromDeg ?? null);

  return (
    <section className="relative -mt-[var(--hero-head)] overflow-clip [--hero-gap:1rem] [--hero-head:calc(5.75rem+env(safe-area-inset-top))] md:[--hero-gap:2rem] lg:mt-0 lg:[--hero-head:var(--topbar-h)]">
      <DuskBackdrop tint={tint} className="absolute inset-0" />
      {/* Bottom fade into the page canvas (~30%). */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-b from-transparent to-[var(--pv-canvas)]"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[84rem] flex-col px-[6.25vw] text-center text-ink dark:text-white">
        {/* Header compensation from the SAME variable used for the pull-up above
            (mobile: 3.25rem bar + 2.5rem location row, the header's own sizes;
            lg: var(--topbar-h), the exact variable the fixed navbar uses), so
            the photo slides behind the transparent navbar with zero drift.
            pt below then lands exactly one --hero-gap under the header. */}
        <div aria-hidden className="h-[var(--hero-head)] shrink-0" />

        {/* Content padding uses one shared value top and bottom (--hero-gap),
            so the two gaps cannot drift apart. The top spacer above already
            compensates the exact header height, hence pt = header + gap and
            pb = the same gap. Inner element sizes and gaps are untouched. */}
        <div className="relative flex flex-col items-center pb-[var(--hero-gap)] pt-[var(--hero-gap)]">
          {/* Soft dark backing so white text reads on the bright dawn photo too.
              Dark mode only — in light mode the text below is dark. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 hidden h-[85%] w-[min(38rem,95%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(6,9,24,0.34),transparent)] dark:block"
          />

          <p className="flex items-center justify-center gap-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[var(--pv-hero-lead)] opacity-85 dark:text-white dark:[text-shadow:0_1px_12px_rgba(6,9,24,0.55)] md:text-[0.6875rem]">
            <Navigation className="size-3.5" fill="currentColor" aria-hidden />
            {t.forecast.hero.locationLabel}
          </p>

          <div className="mt-0.5 text-xl font-normal leading-tight text-[var(--pv-hero-lead)] dark:text-white dark:[text-shadow:0_1px_16px_rgba(6,9,24,0.6)] md:mt-1.5 md:text-[1.875rem] lg:text-[clamp(1.625rem,3.8svh,2.375rem)]">
            <LocationPicker variant="hero" />
          </div>

          <p className="mt-1 font-extralight leading-[0.95] tracking-[-0.03em] text-[var(--pv-hero-lead)] [font-variant-numeric:proportional-nums] dark:text-white dark:[text-shadow:0_2px_24px_rgba(6,9,24,0.6)] md:mt-2">
            <span className="text-5xl md:text-[clamp(5.25rem,13svh,6.75rem)] lg:text-[clamp(4.5rem,11svh,7rem)]">
              {pm === null ? '-' : fmt(pm)}
            </span>
            <span className="ml-1 align-top text-xs font-light text-[var(--pv-hero-sub)] dark:text-white md:text-base">
              {t.today.unit}
            </span>
          </p>

          <p
            className={`mt-1 text-base font-medium md:mt-2 md:text-[1.1875rem] lg:text-[clamp(1rem,2.3svh,1.375rem)] ${condition.className} dark:[text-shadow:0_1px_12px_rgba(6,9,24,0.55)]`}
          >
            {condition.text}
          </p>

          <p className="mt-0.5 text-[0.8125rem] text-[var(--pv-hero-sub)] dark:text-white dark:[text-shadow:0_1px_12px_rgba(6,9,24,0.55)] md:mt-1.5 md:text-base lg:text-[clamp(0.875rem,2svh,1.125rem)]">
            {range}{' '}
            <span className="text-[0.6875rem] opacity-80 md:text-[0.8125rem]">{t.today.unit}</span>
          </p>

          <div className="mt-2 hidden flex-wrap justify-center gap-2 text-xs md:flex">
            <Link
              to="/prakiraan?tab=titik-api"
              className="glass inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 text-ink dark:text-white dark:[text-shadow:0_1px_8px_rgba(6,9,24,0.55)]"
            >
              <Flame className="size-4 shrink-0" aria-hidden />
              {t.forecast.hero.hotspots(hotspotCount === null ? '-' : formatNumber(hotspotCount))}
            </Link>
            <span className="glass inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 text-ink dark:text-white dark:[text-shadow:0_1px_8px_rgba(6,9,24,0.55)]">
              <Wind className="size-4 shrink-0" aria-hidden />
              {windName === null ? '-' : t.forecast.hero.windFrom(windName)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
