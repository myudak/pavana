import type { ForecastHour, Trend } from '@pavana/shared';
import { ArrowRight, ChevronRight, FlaskConical, Leaf, Mountain, Wind } from 'lucide-react';
import { Suspense, lazy, useRef } from 'react';
import { Link } from 'react-router';
import { DataStateBadge } from '@/components/DataStateBadge';
import { ProvenanceNote } from '@/components/ProvenanceNote';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FactorList } from '@/features/insights/FactorList';
import { describeFactor } from '@/features/insights/factor-text';
import { useHotspots } from '@/features/map/use-hotspots';
import { categoryOf } from '@/lib/aq';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy, type Copy } from '@/lib/i18n';
import { useConditions, useExposure, useForecast, useInsights } from '@/lib/queries';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from '@/lib/utils';
import { DuskBackdrop } from './DuskBackdrop';
import { useFitText } from './use-fit-text';
import { ActionsCard } from './ActionsCard';
import { DailyForecastCard } from './DailyForecastCard';
import { ConditionTiles } from './ConditionTiles';
import { SmokeTimeline } from './SmokeTimeline';
import { panelFill, panelSurface } from './glass';
import { HourlyTimeline } from './HourlyTimeline';
import { summarizeDayForecast } from './forecast-summary';

// Heavy visual chunks (Recharts, MapLibre) stay out of the main bundle —
// same lazy pattern as the Map/Insights routes.
const HeroSparkline = lazy(() =>
  import('./HeroSparkline').then((m) => ({ default: m.HeroSparkline })),
);
const ForecastChart = lazy(() =>
  import('@/features/insights/ForecastChart').then((m) => ({ default: m.ForecastChart })),
);
const MapPreview = lazy(() =>
  import('@/features/map/MapPreview').then((m) => ({ default: m.MapPreview })),
);

/** Glass card shared by the hero and the below-fold sections (dark) / clean white (light). */
const glassCard =
  'border-glass-border bg-[var(--pv-glass)] backdrop-blur-[18px] dark:[box-shadow:var(--pv-shadow-lift)]';

/** Compact padding for the below-fold forecast cards (homepage only) — the shared
    Card keeps `p-4` everywhere else. */
const forecastCard = 'p-3';

/**
 * Hero subtext: on lg+ a single line fitted to the card column below
 * (nowrap + justify when it fits scaled, 2-line wrap when it overflows at
 * min size, plain left when shorter than the column). Below lg the classic
 * 2-line clamp is untouched.
 */
function HeroSubtext({ text }: { text: string }) {
  const subRef = useRef<HTMLParagraphElement | null>(null);
  const fitMode = useFitText(subRef, { min: 0.875, max: 1.25 });
  return (
    <p
      ref={subRef}
      className={cn(
        'mt-2 line-clamp-2 max-w-[32.5rem] text-[0.84375rem] leading-[1.25rem] text-[var(--pv-hero-sub)] dark:[text-shadow:0_1px_16px_rgba(6,9,24,0.6)] md:text-[clamp(0.95rem,1.1vw,1.1rem)] md:leading-[1.55] md:line-clamp-none lg:max-w-none lg:text-[clamp(0.875rem,1.9svh,1.0625rem)]',
        fitMode === 'fit' && 'lg:whitespace-nowrap lg:[text-align-last:justify]',
        fitMode === 'left' && 'lg:whitespace-nowrap lg:[text-align-last:auto]',
        fitMode === 'wrap' &&
          'lg:whitespace-normal lg:[text-align-last:auto] lg:line-clamp-2',
      )}
    >
      {text}
    </p>
  );
}

/** "Now → peak" category status for the AQI card's right panel. Null-safe. */
function ForecastStatus({
  nowCat,
  hours,
  trend,
  t,
}: {
  nowCat: ReturnType<typeof categoryOf>;
  hours: ForecastHour[];
  trend: Trend;
  t: Copy;
}) {
  const { peakCat } = summarizeDayForecast(hours);
  const cats = [nowCat, peakCat].filter((c) => c !== 'unknown');
  const unique = [...new Set(cats)];
  return (
    <div>
      {unique.length === 0 ? (
        <p className="text-base font-medium text-ink-muted">{t.today.notEnough}</p>
      ) : unique.length === 1 ? (
        <p className="text-base font-medium text-primary-strong">{t.aqCategory[unique[0]!]}</p>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-base font-medium">
          <span className="text-primary-strong">{t.aqCategory[unique[0]!]}</span>
          <ArrowRight className="size-5 text-ink-muted" aria-hidden />
          <span className="text-accent-strong">{t.aqCategory[unique[1]!]}</span>
        </p>
      )}
      <p className="mt-1.5 line-clamp-3 text-sm leading-[1.3125rem] text-ink-muted">
        {t.trendHeadline[trend]}
      </p>
    </div>
  );
}

export function TodayPage() {
  const t = useCopy();
  const conditions = useConditions();
  const forecast = useForecast(24);
  const insights = useInsights();
  const exposure = useExposure(24);
  const { query: hotspotQuery } = useHotspots();
  // Mobile (< 768px) swaps the heavy below-fold sections for the 10-day card.
  // Conditional render (not CSS hiding) keeps MapLibre/Recharts out of the
  // mobile tree entirely. Desktop renders exactly as before.
  const isMobile = useIsMobile();

  return (
    <QueryState query={conditions}>
      {(c) => {
        const tz = c.location.timezone;
        const cat = categoryOf(c.airQuality.pm25UgM3);
        const pm = c.airQuality.pm25UgM3;

        // Hero subtext: short per-category description in Indonesian,
        // dynamic from the live/fixture AQI category.
        const heroDesc = cat === 'unknown' ? t.today.noData : t.today.heroDesc[cat];
        // Long category names (e.g. "Tidak sehat bagi kelompok sensitif")
        // get a smaller fluid size so they wrap fully instead of clipping.
        const heroLabel = t.aqCategory[cat];
        const heroLabelLong = heroLabel.length > 20;

        // Condition banner sub: real wind sentence when available, else empty.
        const windFactor = insights.data?.factors.find((f) => f.id === 'wind');
        const windText =
          windFactor && typeof windFactor.metrics.directionFromDeg === 'number'
            ? describeFactor(windFactor, t, tz)
            : '';
        const exposurePeak = exposure.data?.summary.peakLevel;
        const bannerHeadline =
          exposure.data && (exposurePeak === 'moderate' || exposurePeak === 'high')
            ? t.exposure.headline[exposurePeak]
            : t.trendHeadline[c.trend];

        return (
          <div>
            {/* ============ FIRST SCREEN — mobile/tablet: unchanged. Desktop
                (lg+): 3-zone flex column (navbar spacer, hero text, picture
                gap, bottom grid), min-height max(100svh, 680px). ============ */}
            <section className="relative -mt-[calc(5.8125rem+env(safe-area-inset-top))] flex flex-col overflow-clip md:-mt-16 md:block md:min-h-[100dvh] lg:-mt-[6rem] lg:flex lg:min-h-[max(100svh,42.5rem)]">
              <DuskBackdrop className="absolute inset-0" />

              <div className="flex flex-1 flex-col px-4 md:block md:px-[6.25vw] lg:flex">
                <div className="relative mx-auto flex w-full max-w-[84rem] flex-1 flex-col gap-0 pt-0 md:grid md:gap-8 md:pb-10 md:pt-24 lg:flex lg:flex-col lg:gap-0 lg:p-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                  {/* Photo gap (mobile): fixed image-only space from below the
                      location row (header is 93px: 52 bar + 41 row) to the hero
                      lead — the pine band lands here. Remaining screen height
                      goes to the svh-clamped content sizes below. Short screens
                      fall back to the 64px spec minimum so the banner clears
                      the tab bar. */}
                  <div
                    aria-hidden
                    data-pv-gap
                    className="h-[calc(5.8125rem+env(safe-area-inset-top)+clamp(4rem,12svh,6.875rem))] shrink-0 md:hidden [@media((max-width:767px)_and_(max-height:760px))]:h-[calc(5.8125rem+env(safe-area-inset-top)+4rem)]"
                  />
                  {/* Navbar spacer (lg only) — the photo/sky stays behind it. */}
                  <div aria-hidden className="hidden shrink-0 lg:block lg:h-24" />
                  {/* Picture gap (lg only, like mobile): ridge photo only, no content. */}
                  <div aria-hidden className="hidden lg:block lg:min-h-[4.5rem] lg:flex-[1_1_0]" />
                  {/* TOP ZONE (lg): hero text below the picture gap. */}
                  <div className="min-w-0 max-w-[45rem] lg:max-w-none lg:pr-[calc(20rem+2rem)]">
                    {/* Demo chip: in-flow above the lead on every breakpoint. */}
                    {c.state === 'demo' && (
                      <p
                        role="note"
                        title={t.demoBannerDetail}
                        className="mb-2 hidden max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-glass-border bg-glass-hero px-3 py-1 text-xs text-ink backdrop-blur-md md:inline-flex lg:hidden"
                      >
                        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">{t.demoBanner}</span>
                      </p>
                    )}
                    <p className="text-[1.125rem] font-light leading-tight text-[var(--pv-hero-lead)] dark:[text-shadow:0_2px_24px_rgba(6,9,24,0.65)] md:text-[clamp(1.3rem,1.9vw,1.8rem)] lg:text-[clamp(1.25rem,3svh,1.75rem)]">
                      {t.today.heroLead}
                    </p>
                    <h1
                      className={cn(
                        'mb-[-0.12em] mt-1 line-clamp-2 max-w-full bg-clip-text pb-[0.12em] font-bold tracking-[-0.025em] text-balance text-transparent dark:[filter:drop-shadow(0_2px_24px_rgba(6,9,24,0.45))] md:mt-1.5 md:line-clamp-none',
                        'text-[clamp(1.625rem,4svh,2.125rem)] leading-[1.15]',
                        heroLabelLong
                          ? 'md:text-[clamp(1.7rem,3.2vw,2.8rem)] md:leading-[1.12] lg:text-[clamp(1.875rem,4.6svh,2.75rem)]'
                          : 'md:text-[clamp(2.2rem,4.3vw,3.75rem)] md:leading-[1.08] lg:text-[clamp(2.5rem,6.5svh,4rem)]',
                        // Short screens: tighten further so banner + Demo row
                        // clear the tab bar. Mobile only, desktop untouched.
                        '[@media((max-width:767px)_and_(max-height:760px))]:text-[1.6875rem] [@media((max-width:767px)_and_(max-height:760px))]:leading-[1.9375rem]',
                      )}
                      style={{ backgroundImage: 'var(--pv-gradient-headline)' }}
                    >
                      {heroLabel}
                    </h1>
                    <HeroSubtext text={heroDesc} />
                  </div>

                  {/* BOTTOM ZONE (lg): PM2.5 + hourly + banner left, hotspot right. */}
                  <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-8 lg:pb-0">
                    <div className="min-w-0 max-w-[45rem] lg:max-w-[62.5rem]">
                      {/* AQI glass card — horizontal: big number left, chart right, one row. */}
                      <section
                        aria-label={t.today.pm25Label}
                        className={cn(
                          'relative mt-[clamp(0.5rem,1.5svh,1rem)] grid overflow-hidden rounded-[1.375rem] md:mt-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:rounded-[1.25rem] lg:mt-[clamp(1rem,2.5svh,1.75rem)] lg:h-[clamp(7.5rem,16svh,9.375rem)]',
                          panelFill,
                        )}
                      >
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--panel-border)]"
                        />
                        <div className="min-w-0 p-[clamp(0.875rem,2svh,1.25rem)] md:p-3 md:px-4 md:py-3 lg:flex lg:flex-col lg:justify-center lg:p-4 lg:px-5">
                          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-muted dark:text-white/60 md:text-sm">
                            {t.today.pm25Label}
                          </p>
                          {pm === null ? (
                            <p className="mt-2 text-ink-muted">{t.today.noData}</p>
                          ) : (
                            <>
                              <div className="mt-1 flex items-center justify-between gap-3 md:mt-1.5 md:flex-wrap md:justify-start md:gap-x-5 md:gap-y-2">
                                <p className="flex items-baseline gap-2">
                                  <span className="text-[clamp(2.5rem,6svh,3.25rem)] font-bold leading-none tabular-nums text-ink dark:text-white md:text-[clamp(1.85rem,2.3vw,2.35rem)] md:font-semibold lg:text-[clamp(2.125rem,5svh,2.875rem)] [@media((max-width:767px)_and_(max-height:760px))]:text-[2.5rem]">
                                    {formatNumber(pm)}
                                  </span>
                                  <span className="text-sm text-ink-muted dark:text-white/60">
                                    {t.today.unit}
                                  </span>
                                </p>
                                <QueryState query={forecast} inline>
                                  {(f) => (
                                    <Suspense
                                      fallback={
                                        <div
                                          className="h-10 w-[9.375rem] shrink-0 animate-pulse rounded-xl bg-surface-muted md:w-[12.5rem]"
                                          aria-hidden
                                        />
                                      }
                                    >
                                      <HeroSparkline
                                        hours={f.hours}
                                        className="h-10 w-[9.375rem] md:w-[12.5rem] xl:w-[13.75rem]"
                                      />
                                    </Suspense>
                                  )}
                                </QueryState>
                              </div>
                              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.9375rem]">
                                <Leaf className="size-4 shrink-0 text-accent-strong" aria-hidden />
                                <span className="font-medium text-accent-strong">
                                  {t.aqCategory[cat]}
                                </span>
                                {c.airQuality.aqi && (
                                  <span
                                    className="text-[0.6875rem] text-ink-muted dark:text-white/55 md:text-[0.9375rem]"
                                    title={t.aqiIndicative}
                                  >
                                    · US AQI {c.airQuality.aqi.value} · {t.aqiIndicativeShort}
                                  </span>
                                )}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="hidden min-w-0 border-t border-hairline p-3 dark:border-white/10 md:block md:border-l md:border-t-0 md:px-4 md:py-3 lg:flex lg:flex-col lg:justify-center">
                          <Link
                            to="/prakiraan"
                            className="flex items-center gap-2 text-sm text-ink hover:opacity-80"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {t.today.todayForecast}
                            </span>
                            {c.state === 'demo' && (
                              <span
                                title={`${t.common.source}: ${c.airQuality.provenance.provider} · ${t.provenanceKind[c.airQuality.provenance.kind]} · ${t.common.validAt} ${formatDateTime(c.airQuality.provenance.validAt, tz)}`}
                              >
                                <DataStateBadge state="demo" />
                              </span>
                            )}
                            <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
                          </Link>
                          <div className="mt-2">
                            {forecast.isPending ? (
                              <div className="space-y-2" aria-hidden>
                                <div className="h-6 w-3/4 animate-pulse rounded bg-surface-muted" />
                                <div className="h-4 w-full animate-pulse rounded bg-surface-muted" />
                              </div>
                            ) : forecast.isError ? (
                              <p className="text-sm text-ink-muted">{t.common.errorTitle}</p>
                            ) : (
                              <ForecastStatus
                                nowCat={cat}
                                hours={forecast.data.hours}
                                trend={c.trend}
                                t={t}
                              />
                            )}
                          </div>
                        </div>
                      </section>

                      <div className="mt-1 hidden items-center gap-2 text-xs md:flex md:flex-wrap lg:hidden">
                        <DataStateBadge state={c.state} />
                        <ProvenanceNote
                          provenance={c.airQuality.provenance}
                          timeZone={tz}
                          className="min-w-0 basis-full sm:basis-auto"
                        />
                      </div>

                      <div className="mb-1 mt-[clamp(0.5rem,1.5svh,1rem)] flex items-center justify-between gap-3 md:mt-2 lg:mt-[clamp(0.5rem,1.3svh,0.875rem)]">
                        <p className="text-[0.6875rem] font-medium tracking-[0.2em] text-ink-muted md:text-[0.8125rem] md:tracking-[0.25em] lg:text-xs">
                          {t.today.hourlyLabel}
                        </p>
                        <Link
                          to="/prakiraan"
                          className="inline-flex min-h-[2.5rem] shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-primary-strong md:min-h-0 md:text-sm"
                        >
                          {t.today.seeAll} <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                      {forecast.isPending ? (
                        <div
                          className="grid grid-cols-6 gap-1 overflow-hidden rounded-[1.125rem] border border-glass-border bg-glass-hero p-1.5 max-[359px]:flex max-[359px]:snap-x max-[359px]:snap-mandatory max-[359px]:gap-2.5 max-[359px]:overflow-x-auto md:gap-3 md:border-0 md:bg-transparent md:p-0"
                          aria-hidden
                        >
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className="h-[clamp(5rem,11svh,6.25rem)] min-w-0 flex-1 animate-pulse rounded-xl bg-surface-muted/50 max-[359px]:min-w-[3.5rem] md:h-[5.625rem] md:rounded-2xl md:border md:border-glass-border md:bg-glass-hero lg:h-[clamp(4.75rem,10svh,6rem)]"
                            />
                          ))}
                        </div>
                      ) : forecast.isError ? (
                        <p className="text-sm text-ink-muted">{t.common.errorTitle}</p>
                      ) : (
                        <HourlyTimeline hours={forecast.data.hours} timeZone={tz} variant="strip" />
                      )}

                      <Link
                        to="/prakiraan"
                        className={cn(
                          'mt-[clamp(0.5rem,1.5svh,1rem)] flex max-h-[4.75rem] min-h-[3rem] items-center gap-3 rounded-[1.125rem] border p-3 md:mt-2 md:px-4 md:py-1 lg:mt-[clamp(0.5rem,1.3svh,0.875rem)] lg:h-[clamp(3rem,6svh,3.625rem)] lg:min-h-0 lg:max-h-none lg:py-0',
                          panelSurface,
                        )}
                      >
                        <Wind className="size-7 shrink-0 text-primary-strong" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium md:overflow-visible md:whitespace-normal md:text-clip md:text-[0.9375rem]">
                            {bannerHeadline}
                          </span>
                          {windText && (
                            <span className="mt-0.5 line-clamp-2 block text-xs text-ink-muted md:text-[0.8125rem] md:line-clamp-none">
                              {windText}
                            </span>
                          )}
                        </span>
                        <ChevronRight
                          className="size-4 shrink-0 text-ink-muted md:size-5"
                          aria-hidden
                        />
                      </Link>
                    </div>

                    {/* Right column: hotspot block, bottom-aligned with the hourly strip */}
                    <div className="hidden min-w-0 flex-col justify-end md:flex lg:pt-0">
                      <div className="flex items-stretch gap-8">
                        <div
                          aria-hidden
                          className="hidden w-px shrink-0 self-stretch bg-hairline dark:bg-white/15 lg:block"
                        />
                        <div className="min-w-0 flex-1">
                          <Mountain className="size-8 text-accent-strong" aria-hidden />
                          <p className="mt-2 text-[0.625rem] font-medium tracking-[0.2em] text-ink-muted">
                            {t.today.hotspotEyebrow}
                          </p>
                          <p className="mt-1.5 flex items-center gap-2 text-base">
                            {hotspotQuery.isPending ? (
                              <span
                                className="inline-block h-[1.125rem] w-32 animate-pulse rounded bg-surface-muted"
                                aria-hidden
                              />
                            ) : hotspotQuery.isError ? (
                              <span className="text-ink-muted">{t.today.hotspotUnavailable}</span>
                            ) : (
                              <>
                                <span
                                  className="size-2 shrink-0 rounded-full bg-accent"
                                  style={{ boxShadow: '0 0 10px var(--pv-accent)' }}
                                  aria-hidden
                                />
                                {t.today.hotspotCount(hotspotQuery.data.hotspots.length)}
                              </>
                            )}
                          </p>
                          <p className="mt-1.5 max-w-[15rem] text-sm leading-[1.3125rem] text-ink-muted">
                            {t.map.hotspotDisclaimer}
                          </p>
                          <Link
                            to="/peta"
                            className="mt-3 inline-flex h-9 w-[8.25rem] items-center justify-center gap-2 rounded-full border border-accent/50 text-sm font-medium hover:[box-shadow:var(--pv-glow-accent)]"
                          >
                            {t.map.openFull} <ArrowRight className="size-4" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ============ BELOW THE FOLD — mobile: 10-day outlook only;
                desktop: chart + map (7 cols), 10-day outlook pinned to their
                height (5 cols), then why + actions. ============ */}
            <div className="bg-canvas [--section-gap:20px]">
              {isMobile ? (
                <div className="space-y-4 px-4 pb-28 pt-3">
                  <DailyForecastCard timeZone={tz} nowPm25={pm} />
                  <QueryState query={exposure}>
                    {(x) => <SmokeTimeline exposure={x} timeZone={tz} />}
                  </QueryState>
                  <ConditionTiles conditions={c} now={exposure.data?.hours[0]} />
                </div>
              ) : (
                <div className="px-[6.25vw] pb-28 lg:pt-[var(--section-gap)]">
                  <div className="mx-auto grid w-full max-w-[84rem] gap-4 lg:grid-cols-12 lg:gap-[var(--section-gap)]">
                    <Card className={cn('lg:col-span-7 lg:row-start-1', glassCard, forecastCard)}>
                      <CardHeader className="mb-2">
                        <CardTitle>
                          {t.insights.chartTitle}{' '}
                          <span className="normal-case tracking-normal">({t.today.unit})</span>
                        </CardTitle>
                        <Link
                          to="/prakiraan"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong"
                        >
                          {t.today.seeAll} <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </CardHeader>
                      <QueryState query={forecast}>
                        {(f) => (
                          <Suspense
                            fallback={
                              <div
                                className="h-56 w-full animate-pulse rounded-2xl bg-surface-muted"
                                aria-hidden
                              />
                            }
                          >
                            <ForecastChart
                              hours={f.hours}
                              timeZone={tz}
                              nowLabel={t.insights.nowMarker}
                            />
                          </Suspense>
                        )}
                      </QueryState>
                    </Card>

                    <Card className={cn('lg:col-span-7 lg:row-start-2', glassCard, forecastCard)}>
                      <CardHeader className="mb-2">
                        <CardTitle>{t.map.title}</CardTitle>
                        <Link
                          to="/peta"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong"
                        >
                          {t.today.seeAll} <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </CardHeader>
                      <Suspense
                        fallback={
                          <div
                            className="h-48 w-full animate-pulse rounded-[1.5rem] bg-surface-muted"
                            aria-hidden
                          />
                        }
                      >
                        <MapPreview />
                      </Suspense>
                    </Card>
                    {/* Right column: 10-day outlook pinned to the left column's
                          height — absolute, so it never stretches the grid rows. */}
                    <div className="relative min-h-[32.5rem] lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1">
                      <DailyForecastCard
                        timeZone={tz}
                        nowPm25={pm}
                        className="lg:absolute lg:inset-0"
                      />
                    </div>

                    <Card className={cn('lg:col-span-7 lg:row-start-3', glassCard, forecastCard)}>
                      <CardHeader className="mb-2">
                        <CardTitle>{t.today.whyTitle}</CardTitle>
                        <Link
                          to="/prakiraan"
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong"
                        >
                          {t.today.whyMore} <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </CardHeader>
                      <QueryState query={insights}>
                        {(i) => <FactorList factors={i.factors} timeZone={tz} />}
                      </QueryState>
                    </Card>

                    <ActionsCard
                      query={conditions}
                      className={cn(
                        'lg:col-span-5 lg:col-start-8 lg:row-start-3',
                        glassCard,
                        forecastCard,
                      )}
                    />

                    <div className={cn('lg:col-span-7 lg:row-start-4', glassCard, forecastCard, 'rounded-card border p-3')}>
                      <QueryState query={exposure}>
                        {(x) => <SmokeTimeline exposure={x} timeZone={tz} />}
                      </QueryState>
                    </div>

                    <div className={cn('lg:col-span-5 lg:col-start-8 lg:row-start-4', glassCard, forecastCard, 'rounded-card border p-3')}>
                      <QueryState query={exposure}>
                        {() => <ConditionTiles conditions={c} now={exposure.data?.hours[0]} />}
                      </QueryState>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
