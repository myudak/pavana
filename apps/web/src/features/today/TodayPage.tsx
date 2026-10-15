import { ArrowRight, Info, MapPin } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { AqCategoryPill } from '@/components/AqCategoryPill';
import { DataStateBadge } from '@/components/DataStateBadge';
import { DemoBanner } from '@/components/DemoBanner';
import { DuskHero } from '@/components/DuskHero';
import { ProvenanceNote } from '@/components/ProvenanceNote';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FactorList } from '@/features/insights/FactorList';
import { categoryOf } from '@/lib/aq';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { HourlyTimeline } from './HourlyTimeline';

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

export function TodayPage() {
  const t = useCopy();
  const conditions = useConditions();
  const forecast = useForecast(24);
  const insights = useInsights();

  return (
    <div className="space-y-4">
      <QueryState query={conditions}>
        {(c) => {
          const tz = c.location.timezone;
          const cat = categoryOf(c.airQuality.pm25UgM3);
          return (
            <>
              {c.state === 'demo' && <DemoBanner />}

              <header className="space-y-1 pt-2">
                <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <MapPin className="size-4 shrink-0" aria-hidden />
                  {c.location.name}
                  {c.location.admin2 ? `, ${c.location.admin2}` : ''}
                </p>
                <h1 className="max-w-3xl font-heading text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                  {t.trendHeadline[c.trend]}
                </h1>
              </header>

              <div className="grid items-start gap-4 lg:grid-cols-5 lg:gap-5">
                <div className="space-y-4 lg:col-span-3">
                  <section className="relative overflow-hidden rounded-card border border-border">
                    <DuskHero className="absolute inset-0 hidden h-full w-full dark:block" />
                    <div
                      aria-hidden
                      className="absolute inset-0 hidden dark:block"
                      style={{ background: 'var(--pv-hero-scrim)' }}
                    />
                    <div className="relative space-y-4 p-5 md:p-6">
                      <p
                        className={cn(
                          'font-heading text-5xl font-bold leading-none tracking-tight md:text-6xl',
                          'dark:bg-gradient-to-r dark:from-accent dark:to-primary dark:bg-clip-text dark:text-transparent',
                        )}
                      >
                        {t.aqCategory[cat]}
                      </p>

                      <div className="rounded-2xl border border-border bg-surface p-4 dark:border-white/10 dark:bg-[var(--pv-glass)] dark:backdrop-blur dark:[box-shadow:var(--pv-shadow-lift)]">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                            {t.today.currentTitle}
                          </p>
                          <DataStateBadge state={c.state} />
                        </div>
                        {c.airQuality.pm25UgM3 === null ? (
                          <p className="mt-2 text-ink-muted">{t.today.noData}</p>
                        ) : (
                          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                            <div className="space-y-2">
                              <p className="flex items-baseline gap-2">
                                <span className="font-heading text-6xl font-semibold tabular-nums tracking-tight">
                                  {formatNumber(c.airQuality.pm25UgM3)}
                                </span>
                                <span className="text-lg text-ink-muted">{t.today.unit}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <AqCategoryPill category={cat} />
                                {c.airQuality.aqi && (
                                  <span className="text-xs text-ink-muted" title={t.aqiIndicative}>
                                    US AQI {c.airQuality.aqi.value} · {t.aqiIndicativeShort}
                                  </span>
                                )}
                              </div>
                            </div>
                            <QueryState query={forecast} inline>
                              {(f) => (
                                <Suspense
                                  fallback={
                                    <div
                                      className="h-14 w-36 shrink-0 animate-pulse rounded-xl bg-surface-muted"
                                      aria-hidden
                                    />
                                  }
                                >
                                  <HeroSparkline hours={f.hours} />
                                </Suspense>
                              )}
                            </QueryState>
                          </div>
                        )}
                      </div>

                      <ProvenanceNote provenance={c.airQuality.provenance} timeZone={tz} />
                    </div>
                  </section>

                  <Card>
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

                  <Card>
                    <CardHeader>
                      <CardTitle>{t.today.timelineTitle}</CardTitle>
                    </CardHeader>
                    <QueryState query={forecast}>
                      {(f) => <HourlyTimeline hours={f.hours} timeZone={tz} />}
                    </QueryState>
                  </Card>
                </div>

                <div className="space-y-4 lg:col-span-2">
                  <Card>
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

                  <Card>
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

                  <Card>
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
                </div>
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
