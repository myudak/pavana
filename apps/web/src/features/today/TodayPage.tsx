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
  'border-glass-border bg-glass-hero backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1126]/60 dark:[box-shadow:var(--pv-shadow-soft)]';

/** Compact padding for the below-fold forecast cards (homepage only) — the shared
    Card keeps `p-4` everywhere else. */
const forecastCard = 'p-3';

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
      <p className="mt-1.5 line-clamp-3 text-sm leading-[21px] text-ink-muted">
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

        return (
          <div>
            {/* ============ FIRST SCREEN — compact hero so the next section peeks on desktop ============ */}
            <section className="relative -mt-16 min-h-[100dvh] overflow-clip lg:-mt-16 lg:min-h-0">
              <DuskBackdrop className="absolute inset-0" />

              <div className="px-[6.25vw]">
                <div className="relative mx-auto grid w-full max-w-[1344px] gap-8 pb-10 pt-24 lg:gap-6 lg:pb-2 lg:pt-[76px] xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                  {/* Left column — reference composition: dominant two-tier
                      headline, short description, then the AQI panel. */}
                  <div className="min-w-0 max-w-[720px]">
                    {/* Demo chip: in-flow so it aligns with the hero column and
                        never overlaps the headline; nowrap keeps it one line. */}
                    {c.state === 'demo' && (
                      <p
                        role="note"
                        title={t.demoBannerDetail}
                        className="mb-2 inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full border border-glass-border bg-glass-hero px-3 py-1 text-xs text-ink backdrop-blur-md"
                      >
                        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">{t.demoBanner}</span>
                      </p>
                    )}
                    <p className="text-[clamp(1.3rem,1.9vw,1.8rem)] font-light leading-tight text-[var(--pv-hero-lead)] dark:[text-shadow:0_2px_24px_rgba(6,9,24,0.65)]">
                      {t.today.heroLead}
                    </p>
                    <h1
                      className={cn(
                        'mb-[-0.12em] mt-1.5 max-w-full bg-clip-text pb-[0.12em] font-bold tracking-[-0.025em] text-balance text-transparent dark:[filter:drop-shadow(0_2px_24px_rgba(6,9,24,0.45))]',
                        heroLabelLong
                          ? 'text-[clamp(1.7rem,3.2vw,2.8rem)] leading-[1.12]'
                          : 'text-[clamp(2.2rem,4.3vw,3.75rem)] leading-[1.08]',
                      )}
                      style={{ backgroundImage: 'var(--pv-gradient-headline)' }}
                    >
                      {heroLabel}
                    </h1>
                    <p className="mt-2 max-w-[520px] text-[clamp(0.95rem,1.1vw,1.1rem)] leading-[1.55] text-[var(--pv-hero-sub)] dark:[text-shadow:0_1px_16px_rgba(6,9,24,0.6)]">
                      {heroDesc}
                    </p>

                    {/* AQI glass card — horizontal: big number left, chart right, one row. */}
                    <section
                      aria-label={t.today.pm25Label}
                      className={cn(
                        'mt-3 grid overflow-hidden rounded-[20px] border md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]',
                        heroGlass,
                      )}
                    >
                      <div className="min-w-0 p-3 md:px-4 md:py-3">
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-ink-muted dark:text-white/60">
                          {t.today.pm25Label}
                        </p>
                        {pm === null ? (
                          <p className="mt-2 text-ink-muted">{t.today.noData}</p>
                        ) : (
                          <>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                              <p className="flex items-baseline gap-2">
                                <span className="text-[clamp(1.85rem,2.3vw,2.35rem)] font-semibold leading-none tabular-nums text-ink dark:text-white">
                                  {formatNumber(pm)}
                                </span>
                                <span className="text-sm text-ink-muted dark:text-white/60">{t.today.unit}</span>
                              </p>
                              <QueryState query={forecast} inline>
                                {(f) => (
                                  <Suspense
                                    fallback={
                                      <div
                                        className="h-10 w-[160px] shrink-0 animate-pulse rounded-xl bg-surface-muted sm:w-[200px]"
                                        aria-hidden
                                      />
                                    }
                                  >
                                    <HeroSparkline
                                      hours={f.hours}
                                      className="h-10 w-[160px] sm:w-[200px] xl:w-[220px]"
                                    />
                                  </Suspense>
                                )}
                              </QueryState>
                            </div>
                            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px]">
                              <Leaf className="size-4 shrink-0 text-accent-strong" aria-hidden />
                              <span className="font-medium text-accent-strong">
                                {t.aqCategory[cat]}
                              </span>
                              {c.airQuality.aqi && (
                                <span
                                  className="text-ink-muted dark:text-white/55"
                                  title={t.aqiIndicative}
                                >
                                  · US AQI {c.airQuality.aqi.value} · {t.aqiIndicativeShort}
                                </span>
                              )}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="min-w-0 border-t border-hairline p-3 dark:border-white/10 md:border-l md:border-t-0 md:px-4 md:py-3">
                        <Link
                          to="/insight"
                          className="flex items-center justify-between gap-2 text-sm text-ink hover:opacity-80"
                        >
                          {t.today.todayForecast}
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

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <DataStateBadge state={c.state} />
                      <ProvenanceNote
                        provenance={c.airQuality.provenance}
                        timeZone={tz}
                        className="min-w-0 basis-full sm:basis-auto"
                      />
                    </div>

                    <div className="mb-1 mt-2 flex items-end justify-between gap-3">
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
                        className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-6"
                        aria-hidden
                      >
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-[90px] min-w-[100px] flex-1 animate-pulse rounded-2xl border border-glass-border bg-glass-hero sm:min-w-0"
                          />
                        ))}
                      </div>
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
                        'mt-2 flex min-h-[48px] items-center gap-3 rounded-[18px] border px-4 py-1',
                        heroGlass,
                      )}
                    >
                      <Wind
                        className="size-7 shrink-0 text-primary-strong"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium">
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
                  <div className="flex min-w-0 flex-col justify-end lg:pt-8 xl:pt-10">
                    <div className="flex items-stretch gap-8">
                      <div
                        aria-hidden
                        className="hidden w-px shrink-0 self-stretch bg-hairline dark:bg-white/15 lg:block"
                      />
                      <div className="min-w-0 flex-1">
                        <Mountain className="size-8 text-accent-strong" aria-hidden />
                        <p className="mt-2 text-[10px] font-medium tracking-[0.2em] text-ink-muted">
                          {t.today.hotspotEyebrow}
                        </p>
                        <p className="mt-1.5 flex items-center gap-2 text-base">
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
                        <p className="mt-1.5 max-w-[240px] text-sm leading-[21px] text-ink-muted">
                          {t.map.hotspotDisclaimer}
                        </p>
                        <Link
                          to="/peta"
                          className="mt-3 inline-flex h-9 w-[132px] items-center justify-center gap-2 rounded-full border border-accent/50 text-sm font-medium hover:[box-shadow:var(--pv-glow-accent)]"
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
              <div className="px-[6.25vw] pb-28 pt-6 lg:py-8">
                <div className="mx-auto grid w-full max-w-[1344px] gap-4 lg:grid-cols-12 lg:gap-5">
                  <Card className={cn('lg:col-span-7', glassCard, forecastCard)}>
                    <CardHeader className="mb-2">
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

                  <Card className={cn('lg:col-span-5', glassCard, forecastCard)}>
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

                  <Card className={cn('lg:col-span-6', glassCard, forecastCard)}>
                    <CardHeader className="mb-2">
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

                  <Card className={cn('lg:col-span-6', glassCard, forecastCard)}>
                    <CardHeader className="mb-2">
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
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
                      <Info className="size-3.5" aria-hidden /> {t.today.actionsNote}{' '}
                      {t.today.healthAdviceSource}{' '}
                      <Link to="/info" className="underline">
                        {t.info.linksTitle}
                      </Link>
                    </p>
                  </Card>

                  <Card className={cn('lg:col-span-12', glassCard, forecastCard)}>
                    <CardHeader className="mb-2">
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
