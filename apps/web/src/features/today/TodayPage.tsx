import type { ForecastHour, Trend } from '@pavana/shared';
import { ArrowRight, ChevronRight, FlaskConical, Info, Leaf, Mountain, Wind } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { DataStateBadge } from '@/components/DataStateBadge';
import { ProvenanceNote } from '@/components/ProvenanceNote';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FactorList } from '@/features/insights/FactorList';
import { describeFactor } from '@/features/insights/factor-text';
import { useHotspots } from '@/features/map/use-hotspots';
import { categoryOf } from '@/lib/aq';
import { formatNumber } from '@/lib/format';
import { useCopy, type Copy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { DuskBackdrop } from './DuskBackdrop';
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

/** Lighter translucent surface for the hero panels — the landscape stays visible. */
const heroGlass =
  'border-glass-border bg-glass-hero backdrop-blur-md dark:[box-shadow:var(--pv-shadow-soft)]';

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
        <p className="text-xl font-medium text-ink-muted">{t.today.notEnough}</p>
      ) : unique.length === 1 ? (
        <p className="text-xl font-medium text-primary-strong">{t.aqCategory[unique[0]!]}</p>
      ) : (
        <p className="flex flex-wrap items-center gap-2 text-xl font-medium">
          <span className="text-primary-strong">{t.aqCategory[unique[0]!]}</span>
          <ArrowRight className="size-5 text-ink-muted" aria-hidden />
          <span className="text-accent-strong">{t.aqCategory[unique[1]!]}</span>
        </p>
      )}
      <p className="mt-2 line-clamp-3 text-[15px] leading-[22px] text-ink-muted">
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
  const { query: hotspotQuery } = useHotspots();

  return (
    <QueryState query={conditions}>
      {(c) => {
        const tz = c.location.timezone;
        const cat = categoryOf(c.airQuality.pm25UgM3);
        const pm = c.airQuality.pm25UgM3;

        // Hero subtext: real upwind-detection sentence when the insight names
        // contributing upwind detections, otherwise the trend headline.
        const upwind = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
        const contributing =
          typeof upwind?.metrics.contributingCount === 'number'
            ? upwind.metrics.contributingCount
            : 0;
        const heroSub =
          contributing > 0 && upwind ? describeFactor(upwind, t, tz) : t.trendHeadline[c.trend];

        // Condition banner sub: real wind sentence when available, else empty.
        const windFactor = insights.data?.factors.find((f) => f.id === 'wind');
        const windText =
          windFactor && typeof windFactor.metrics.directionFromDeg === 'number'
            ? describeFactor(windFactor, t, tz)
            : '';

        return (
          <div>
            {/* ============ FIRST SCREEN — full-bleed hero ============ */}
            <section className="relative -mt-16 min-h-[100dvh] overflow-clip lg:-mt-[88px] lg:min-h-[max(100dvh,760px)]">
              <DuskBackdrop className="absolute inset-0" />

              {/* Demo chip: visible without shifting the hero layout. */}
              {c.state === 'demo' && (
                <p
                  role="note"
                  title={t.demoBannerDetail}
                  className="absolute left-4 right-4 top-[4.5rem] inline-flex w-fit items-center gap-1.5 rounded-full border border-glass-border bg-glass-hero px-3 py-1.5 text-xs text-ink backdrop-blur-md md:left-6 md:right-auto lg:left-[6.25vw] lg:top-[100px]"
                >
                  <FlaskConical className="size-3.5 shrink-0" aria-hidden />
                  {t.demoBanner}
                </p>
              )}

              <div className="px-[6.25vw]">
                <div className="relative mx-auto grid w-full max-w-[1344px] gap-10 pb-24 pt-28 lg:gap-0 lg:pb-[60px] lg:pt-[132px] xl:grid-cols-[minmax(0,59.5%)_minmax(0,1fr)]">
                  {/* Left column */}
                  <div className="min-w-0">
                    <p className="text-[clamp(1.5rem,2.47vw,2.375rem)] font-light leading-snug text-[var(--pv-hero-lead)]">
                      {t.today.heroLead}
                    </p>
                    <h1
                      className={cn(
                        'mt-2.5 text-[clamp(2.25rem,4.1vw,4rem)] font-bold leading-[clamp(2.6rem,4.5vw,4.35rem)] tracking-[-0.02em]',
                        cat !== 'unknown'
                          ? 'bg-gradient-to-r from-primary-strong to-accent bg-clip-text text-transparent'
                          : 'text-ink-muted',
                      )}
                    >
                      {t.aqCategory[cat]}
                    </h1>
                    <p className="mt-4 max-w-[400px] text-[clamp(1rem,1.3vw,1.25rem)] leading-[30px] text-[var(--pv-hero-sub)]">
                      {heroSub}
                    </p>

                    {/* AQI glass card */}
                    <section
                      aria-label={t.today.pm25Label}
                      className={cn(
                        'mt-6 grid overflow-hidden rounded-[20px] border md:grid-cols-[63%_minmax(0,1fr)]',
                        heroGlass,
                      )}
                    >
                      <div className="min-w-0 p-4 md:px-5 md:py-4">
                        <p className="text-[18px] text-ink">{t.today.pm25Label}</p>
                        {pm === null ? (
                          <p className="mt-2 text-ink-muted">{t.today.noData}</p>
                        ) : (
                          <>
                            <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
                              <p className="flex items-baseline gap-2">
                                <span className="text-[clamp(3.5rem,4.69vw,4.5rem)] font-semibold leading-none tabular-nums">
                                  {formatNumber(pm)}
                                </span>
                                <span className="text-[18px] text-ink-muted">{t.today.unit}</span>
                              </p>
                              <QueryState query={forecast} inline>
                                {(f) => (
                                  <Suspense
                                    fallback={
                                      <div
                                        className="h-[44px] w-[236px] shrink-0 animate-pulse rounded-xl bg-surface-muted"
                                        aria-hidden
                                      />
                                    }
                                  >
                                    <HeroSparkline hours={f.hours} />
                                  </Suspense>
                                )}
                              </QueryState>
                            </div>
                            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Leaf className="size-5 shrink-0 text-accent-strong" aria-hidden />
                              <span className="text-[18px] font-medium text-accent-strong">
                                {t.aqCategory[cat]}
                              </span>
                              {c.airQuality.aqi && (
                                <span
                                  className="text-xs text-ink-muted"
                                  title={t.aqiIndicative}
                                >
                                  US AQI {c.airQuality.aqi.value} · {t.aqiIndicativeShort}
                                </span>
                              )}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 border-t border-hairline p-4 md:border-l md:border-t-0 md:px-5 md:py-4">
                        <Link
                          to="/insight"
                          className="flex items-center justify-between gap-2 text-[15px] text-ink hover:opacity-80"
                        >
                          {t.today.todayForecast}
                          <ChevronRight className="size-4 shrink-0 text-ink-muted" aria-hidden />
                        </Link>
                        <div className="mt-3">
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

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                      <DataStateBadge state={c.state} />
                      <ProvenanceNote
                        provenance={c.airQuality.provenance}
                        timeZone={tz}
                        className="min-w-0 basis-full sm:basis-auto"
                      />
                    </div>

                    <div className="mb-2 mt-[14px] flex items-end justify-between gap-3">
                      <p className="text-[13px] font-medium tracking-[0.25em] text-ink-muted">
                        {t.today.hourlyLabel}
                      </p>
                      <Link
                        to="/insight"
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary-strong"
                      >
                        {t.today.seeAll} <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                    {forecast.isPending ? (
                      <div
                        className="h-36 animate-pulse rounded-2xl border border-glass-border bg-glass-hero"
                        aria-hidden
                      />
                    ) : forecast.isError ? (
                      <p className="text-sm text-ink-muted">{t.common.errorTitle}</p>
                    ) : (
                      <HourlyTimeline
                        hours={forecast.data.hours}
                        timeZone={tz}
                        variant="strip"
                      />
                    )}

                    <Link
                      to="/insight"
                      className={cn(
                        'mt-4 flex min-h-[64px] items-center gap-4 rounded-[18px] border px-4 py-2.5',
                        heroGlass,
                      )}
                    >
                      <Wind
                        className="size-9 shrink-0 text-primary-strong"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium">
                          {t.trendHeadline[c.trend]}
                        </span>
                        {windText && (
                          <span className="mt-0.5 block text-[13px] text-ink-muted">
                            {windText}
                          </span>
                        )}
                      </span>
                      <ChevronRight
                        className="size-5 shrink-0 text-ink-muted"
                        aria-hidden
                      />
                    </Link>
                  </div>

                  {/* Right column: hotspot block, bottom-aligned with the hourly strip */}
                  <div className="flex min-w-0 flex-col justify-end xl:pl-[28.8%]">
                    <div className="flex items-stretch gap-9">
                      <div
                        aria-hidden
                        className="hidden w-px shrink-0 self-stretch bg-hairline xl:block"
                      />
                      <div className="min-w-0 flex-1">
                        <Mountain className="size-9 text-accent-strong" aria-hidden />
                        <p className="mt-3 text-[10px] font-medium tracking-[0.2em] text-ink-muted">
                          {t.today.hotspotEyebrow}
                        </p>
                        <p className="mt-2 flex items-center gap-2 text-[18px]">
                          {hotspotQuery.isPending ? (
                            <span
                              className="inline-block h-[18px] w-32 animate-pulse rounded bg-surface-muted"
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
                        <p className="mt-2 max-w-[240px] text-sm leading-[21px] text-ink-muted">
                          {t.map.hotspotDisclaimer}
                        </p>
                        <Link
                          to="/peta"
                          className="mt-4 inline-flex h-10 w-[132px] items-center justify-center gap-2 rounded-full border border-accent/50 text-sm font-medium hover:[box-shadow:var(--pv-glow-accent)]"
                        >
                          {t.map.openFull} <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ============ BELOW THE FOLD — kept features on canvas ============ */}
            <div className="bg-canvas">
              <div className="px-[6.25vw] pb-28 pt-10 lg:py-14">
                <div className="mx-auto grid w-full max-w-[1344px] gap-4 lg:grid-cols-12 lg:gap-5">
                  <Card className={cn('lg:col-span-7', glassCard)}>
                    <CardHeader>
                      <CardTitle>
                        {t.insights.chartTitle}{' '}
                        <span className="normal-case tracking-normal">({t.today.unit})</span>
                      </CardTitle>
                      <Link
                        to="/insight"
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

                  <Card className={cn('lg:col-span-5', glassCard)}>
                    <CardHeader>
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

                  <Card className={cn('lg:col-span-6', glassCard)}>
                    <CardHeader>
                      <CardTitle>{t.today.whyTitle}</CardTitle>
                      <Link
                        to="/insight"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-strong"
                      >
                        {t.today.whyMore} <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </CardHeader>
                    <QueryState query={insights}>
                      {(i) => <FactorList factors={i.factors} timeZone={tz} />}
                    </QueryState>
                  </Card>

                  <Card className={cn('lg:col-span-6', glassCard)}>
                    <CardHeader>
                      <CardTitle>{t.today.actionsTitle}</CardTitle>
                    </CardHeader>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {t.today.actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                      {cat !== 'unknown' && (
                        <li key="health-advice">{t.today.healthAdvice[cat]}</li>
                      )}
                    </ul>
                    <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Info className="size-3.5" aria-hidden /> {t.today.actionsNote}{' '}
                      {t.today.healthAdviceSource}{' '}
                      <Link to="/info" className="underline">
                        {t.info.linksTitle}
                      </Link>
                    </p>
                  </Card>

                  <Card className={cn('lg:col-span-12', glassCard)}>
                    <CardHeader>
                      <CardTitle>{t.today.timelineTitle}</CardTitle>
                    </CardHeader>
                    <QueryState query={forecast}>
                      {(f) => <HourlyTimeline hours={f.hours} timeZone={tz} />}
                    </QueryState>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
