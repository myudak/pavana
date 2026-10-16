import { AiBrain01Icon } from '@hugeicons/core-free-icons';
import { PageContainer } from '@/app/layout/PageContainer';
import { Icon } from '@/components/Icon';
import { QueryState } from '@/components/QueryState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HotspotTrendCard } from '@/features/fire/HotspotTrendCard';
import { NearestHotspotsCard } from '@/features/fire/NearestHotspotsCard';
import { InsightAlert } from '@/features/insights/InsightAlert';
import { factorNumber } from '@/features/insights/insight-derive';
import { InsightMetricCards } from '@/features/insights/InsightMetricCards';
import { PM25TimeSeries } from '@/features/insights/PM25TimeSeries';
import { DuskBackdrop } from '@/features/today/DuskBackdrop';
import { panelSurface } from '@/features/today/glass';
import { useCopy } from '@/lib/i18n';
import {
  useConditions,
  useExposure,
  useForecast,
  useInsights,
} from '@/lib/queries';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { TREND_SECTION_ID } from '@/features/fire/trend-link';
import { ForecastHero } from './ForecastHero';

const TAB =
  'h-9 flex-1 rounded-full border-0 text-[13px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent';

const TAB_VALUES = ['air', 'fire'] as const;
type TabValue = (typeof TAB_VALUES)[number];

/** ?tab=titik-api selects the fire tab; everything else falls back to air. */
function tabFromSearch(tab: string | null): TabValue {
  if (tab === 'titik-api') return 'fire';
  return (TAB_VALUES as readonly string[]).includes(tab ?? '') ? (tab as TabValue) : 'air';
}

export default function ForecastPage() {
  const t = useCopy();
  const insights = useInsights();
  const conditions = useConditions();
  // 48h so the PM2.5 chart can offer 24/48h ranges.
  const forecast = useForecast(48);
  const exposure = useExposure(24);
  const tz = forecast.data?.location.timezone ?? insights.data?.location.timezone ?? 'Asia/Jakarta';
  const hotspotFactor = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
  const hotspotCount = factorNumber(hotspotFactor, 'consideredCount');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const tab = tabFromSearch(searchParams.get('tab'));

  // Deep link (e.g. "Lihat tren" from Home): after the fire tab renders,
  // scroll the trend card into view. Client-side routing doesn't apply the
  // hash itself once the tab switches, so this is done manually.
  useEffect(() => {
    if (tab !== 'fire' || hash !== `#${TREND_SECTION_ID}`) return;
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(TREND_SECTION_ID)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [tab, hash]);

  return (
    <>
      <h1 className="sr-only">{t.forecast.title}</h1>
      <QueryState
        query={conditions}
        skeleton={
          <div aria-hidden className="relative overflow-clip">
            <DuskBackdrop className="absolute inset-0" />
            <div className="mx-auto flex min-h-[clamp(320px,46svh,420px)] w-full max-w-[84rem] animate-pulse flex-col items-center justify-center gap-3 px-[6.25vw] lg:min-h-[clamp(360px,44svh,460px)]">
              <div className="h-4 w-32 rounded-full bg-white/20" />
              <div className="h-8 w-56 rounded-xl bg-white/20" />
              <div className="h-28 w-64 rounded-2xl bg-white/15" />
            </div>
          </div>
        }
      >
        {(c) => (
          <ForecastHero
            conditions={c}
            exposure={exposure.data}
            hours={forecast.data?.hours ?? []}
            hotspotCount={hotspotCount}
          />
        )}
      </QueryState>
      <PageContainer className="pt-0">
      {conditions.data && (
        <InsightAlert conditions={conditions.data} forecastHours={forecast.data?.hours ?? []} />
      )}

      <Tabs
        value={tab}
        // Manual tab switches replace the URL without a hash, so no
        // auto-scroll runs and the back button still returns to Home.
        onValueChange={(v) =>
          navigate(v === 'fire' ? '/prakiraan?tab=titik-api' : '/prakiraan', { replace: true })
        }
        className="gap-4"
      >
        <TabsList className="glass h-11 w-full rounded-full p-1">
          <TabsTrigger value="air" className={TAB}>
            {t.forecast.tabs.air}
          </TabsTrigger>
          <TabsTrigger value="fire" className={TAB}>
            {t.forecast.tabs.fire}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="air">
          <section className={cn(panelSurface, 'rounded-3xl p-5')}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              {t.forecast.airTitle}{' '}
              <span className="normal-case tracking-normal">({t.today.unit})</span>
            </h2>
            <QueryState
              query={forecast}
              skeleton={<Skeleton className="h-56 w-full rounded-2xl" />}
            >
              {(f) => <PM25TimeSeries hours={f.hours} timeZone={tz} />}
            </QueryState>
          </section>
        </TabsContent>
        <TabsContent value="fire" className="space-y-4">
          <HotspotTrendCard />
          <NearestHotspotsCard showLink={false} />
        </TabsContent>
      </Tabs>

      {conditions.data && (
        <section aria-label={t.forecast.factorsTitle}>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
              {t.forecast.factorsTitle}
            </h2>
            <InsightMetricCards conditions={conditions.data} insights={insights} />
        </section>
      )}

      <section className={cn(panelSurface, 'rounded-3xl p-5')}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-state-demo/15">
            <Icon icon={AiBrain01Icon} className="text-state-demo" />
          </span>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">{t.forecast.modelTitle}</h2>
              <span className="rounded-full bg-state-stale/15 px-2 py-0.5 text-[11px] font-semibold text-state-stale ring-1 ring-state-stale/30">
                {t.forecast.modelStatus}
              </span>
            </div>
            {/* SHAP / intervals render only when model.evaluated is true — never faked. */}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.forecast.modelBody}
            </p>
          </div>
        </div>
        <details className="group mt-4 rounded-2xl bg-foreground/5 p-3 text-sm">
          <summary className="cursor-pointer font-medium">{t.insights.howTitle}</summary>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
            {t.insights.howBody.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      </section>
      </PageContainer>
    </>
  );
}
