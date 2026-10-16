import { AiBrain01Icon } from '@hugeicons/core-free-icons';
import { DemoBanner, DemoPill } from '@/components/DemoBanner';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InsightAlert } from '@/features/insights/InsightAlert';
import { InsightMetricCards } from '@/features/insights/InsightMetricCards';
import { InsightNotifications } from '@/features/insights/InsightNotifications';
import { PM25TimeSeries } from '@/features/insights/PM25TimeSeries';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useCopy } from '@/lib/i18n';
import {
  useConditions,
  useExposure,
  useForecast,
  useInsights,
  useOfficialLinks,
} from '@/lib/queries';
import { SmokeBars } from './SmokeBars';
import { BmkgReference } from './BmkgReference';
import { WeatherTable } from './WeatherTable';

const TAB =
  'h-9 flex-1 rounded-full border-0 text-[13px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground dark:data-[state=active]:border-transparent';

export default function ForecastPage() {
  const t = useCopy();
  const insights = useInsights();
  const conditions = useConditions();
  // 48h so the PM2.5 chart can offer 24/48h ranges; the weather table shows the first 24.
  const forecast = useForecast(48);
  const officialLinks = useOfficialLinks();
  const exposure = useExposure(24);
  const tz = forecast.data?.location.timezone ?? insights.data?.location.timezone ?? 'Asia/Jakarta';
  const isDemo = forecast.data?.state === 'demo';

  return (
    <div className="space-y-4 pt-4 sm:pt-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <LocationPicker />
          {isDemo && <DemoPill />}
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight drop-shadow-sm">
          {t.forecast.title}
        </h1>
      </header>

      {conditions.data && (
        <InsightAlert conditions={conditions.data} forecastHours={forecast.data?.hours ?? []} />
      )}

      <Tabs defaultValue="air" className="gap-4">
        <TabsList className="glass h-11 w-full rounded-full p-1">
          <TabsTrigger value="air" className={TAB}>
            {t.forecast.tabs.air}
          </TabsTrigger>
          <TabsTrigger value="smoke" className={TAB}>
            {t.forecast.tabs.smoke}
          </TabsTrigger>
          <TabsTrigger value="weather" className={TAB}>
            {t.forecast.tabs.weather}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="air">
          <Panel
            title={
              <>
                {t.forecast.airTitle}{' '}
                <span className="normal-case tracking-normal">({t.today.unit})</span>
              </>
            }
          >
            <QueryState
              query={forecast}
              skeleton={<Skeleton className="h-56 w-full rounded-2xl" />}
            >
              {(f) => <PM25TimeSeries hours={f.hours} timeZone={tz} />}
            </QueryState>
          </Panel>
        </TabsContent>
        <TabsContent value="smoke">
          <Panel title={t.forecast.smokeTitle}>
            <QueryState
              query={exposure}
              skeleton={<Skeleton className="h-48 w-full rounded-2xl" />}
            >
              {(x) => <SmokeBars hours={x.hours} timeZone={tz} />}
            </QueryState>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {t.exposure.disclaimer}
            </p>
          </Panel>
        </TabsContent>
        <TabsContent value="weather">
          <Panel title={t.forecast.weatherTitle}>
            <QueryState
              query={forecast}
              skeleton={<Skeleton className="h-36 w-full rounded-2xl" />}
            >
              {(f) => (
                <>
                  <WeatherTable hours={f.hours.slice(0, 24)} timeZone={tz} />
                  {f.state !== 'demo' && <BmkgReference timeZone={tz} />}
                </>
              )}
            </QueryState>
          </Panel>
        </TabsContent>
      </Tabs>

      {conditions.data && (
        <>
          <InsightNotifications
            conditions={conditions.data}
            insights={insights.data}
            forecastHours={forecast.data?.hours ?? []}
            officialLinks={officialLinks}
          />
          <section aria-label={t.forecast.factorsTitle} className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t.forecast.factorsTitle}
            </h2>
            <InsightMetricCards conditions={conditions.data} insights={insights} />
          </section>
        </>
      )}

      <div className="[&>*]:min-w-0">
        <Panel>
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
        </Panel>
      </div>

      {isDemo && <DemoBanner />}
    </div>
  );
}
