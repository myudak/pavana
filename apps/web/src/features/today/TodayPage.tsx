import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router';
import { DemoBanner } from '@/components/DemoBanner';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { Skeleton } from '@/components/ui/skeleton';
import { FactorList } from '@/features/insights/FactorList';
import { categoryOf } from '@/lib/aq';
import { useCopy } from '@/lib/i18n';
import { useConditions, useExposure, useForecast, useInsights } from '@/lib/queries';
import { DailyForecast } from './DailyForecast';
import { ConditionTiles } from './ConditionTiles';
import { ExposureHero } from './ExposureHero';
import { HourlyStrip } from './HourlyStrip';
import { SmokeTimeline } from './SmokeTimeline';

// MapLibre stays out of the main bundle.
const MapPreview = lazy(() =>
  import('@/features/map/MapPreview').then((m) => ({ default: m.MapPreview })),
);

function HeroSkeleton() {
  return (
    <div className="space-y-4 pt-6">
      <Skeleton className="h-6 w-40 rounded-full" />
      <Skeleton className="h-24 w-4/5 rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-3xl" />
    </div>
  );
}

export function TodayPage() {
  const t = useCopy();
  const conditions = useConditions();
  const exposure = useExposure(24);
  const insights = useInsights();
  const forecast = useForecast(120);

  return (
    <QueryState query={conditions} skeleton={<HeroSkeleton />}>
      {(c) => {
        const tz = c.location.timezone;
        const cat = categoryOf(c.airQuality.pm25UgM3);
        const e = exposure.data;
        return (
          <div className="space-y-4">
            <ExposureHero conditions={c} exposure={e} />

            <div className="grid items-start gap-4 lg:grid-cols-5 [&>*]:min-w-0">
              <div className="space-y-4 lg:col-span-3">
                <QueryState
                  query={exposure}
                  skeleton={<Skeleton className="h-64 w-full rounded-3xl" />}
                >
                  {(x) => <SmokeTimeline exposure={x} timeZone={tz} />}
                </QueryState>

                <Panel title={t.home.hourlyTitle}>
                  <QueryState query={exposure} inline>
                    {(x) => <HourlyStrip hours={x.hours} timeZone={tz} />}
                  </QueryState>
                </Panel>

                <ConditionTiles conditions={c} now={e?.hours[0]} />
                <Panel title={t.dailyForecast.title}>
                  <QueryState query={forecast} inline>
                    {(f) => <DailyForecast hours={f.hours} timeZone={tz} />}
                  </QueryState>
                </Panel>
              </div>

              <div className="space-y-4 lg:col-span-2">
                <Panel title={t.home.whyTitle} action={{ to: '/prakiraan', label: t.home.whyCta }}>
                  <QueryState query={insights} inline>
                    {(i) => <FactorList factors={i.factors} timeZone={tz} compact />}
                  </QueryState>
                </Panel>

                <Panel title={t.home.mapTitle} action={{ to: '/peta', label: t.home.mapCta }}>
                  <Suspense fallback={<Skeleton className="h-48 w-full rounded-2xl" />}>
                    <MapPreview />
                  </Suspense>
                </Panel>

                <Panel title={t.today.actionsTitle}>
                  <ul className="space-y-2 text-sm leading-relaxed">
                    {cat !== 'unknown' && (
                      <li className="rounded-2xl bg-foreground/5 p-3 font-medium">
                        {t.today.healthAdvice[cat]}
                      </li>
                    )}
                    {t.today.actions.map((a) => (
                      <li key={a} className="px-1 text-muted-foreground">
                        {a}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    <Icon icon={InformationCircleIcon} className="mt-px size-3.5" />
                    <span>
                      {t.today.actionsNote} {t.today.healthAdviceSource}{' '}
                      <Link to="/info" className="underline underline-offset-2">
                        {t.info.linksTitle}
                      </Link>
                    </span>
                  </p>
                </Panel>
              </div>
            </div>

            {c.state === 'demo' && <DemoBanner />}
          </div>
        );
      }}
    </QueryState>
  );
}
