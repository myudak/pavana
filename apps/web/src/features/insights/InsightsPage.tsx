import { AtmosphereSection } from '@/components/AtmosphereSection';
import { DemoBanner } from '@/components/DemoBanner';
import { QueryState } from '@/components/QueryState';
import { useCopy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights, useOfficialLinks } from '@/lib/queries';
import { InsightAlert } from './InsightAlert';
import { InsightHeader } from './InsightHeader';
import { InsightMetricCards } from './InsightMetricCards';
import { InsightNotifications } from './InsightNotifications';
import { PM25TimeSeries } from './PM25TimeSeries';

/**
 * Insight — banner → hero PM2.5 time series → prominent notifications panel with
 * per-notification recommendations → compact indicators → short guidance.
 * Indonesian-only copy lives in lib/i18n/id.ts; every number carries provenance.
 */
export default function InsightsPage() {
  const t = useCopy();
  const conditions = useConditions();
  // Widest offered range (API caps at 72h); the chart slices client-side.
  const forecast = useForecast(48);
  const insights = useInsights();
  const officialLinks = useOfficialLinks();

  return (
    <div className="mx-auto w-full max-w-[84rem] space-y-4 px-4 pb-28 pt-2 md:px-6 lg:px-8 lg:pb-12">
      <QueryState query={conditions}>
        {(c) => {
          const forecastHours = forecast.data?.hours ?? [];
          return (
            <>
              {c.state === 'demo' && <DemoBanner />}
              <InsightHeader state={c.state} />
              <InsightAlert conditions={c} forecastHours={forecastHours} />

              <AtmosphereSection
                id="prakiraan-pm25"
                labelledBy="prakiraan-pm25-title"
                className="scroll-mt-24"
              >
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h2
                    id="prakiraan-pm25-title"
                    className="font-heading text-xl font-semibold tracking-tight"
                  >
                    {t.insights.chartTitle}{' '}
                    <span className="text-sm font-normal text-ink-muted">({t.today.unit})</span>
                  </h2>
                </div>

                <QueryState query={forecast}>
                  {(f) => <PM25TimeSeries hours={f.hours} timeZone={c.location.timezone} />}
                </QueryState>

                <details className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm">
                  <summary className="flex min-h-11 cursor-pointer items-center font-medium">
                    {t.insights.howTitle}
                  </summary>
                  <p className="mt-1 text-ink-muted">{t.insights.methodDeterministic}</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-ink-muted">
                    {t.insights.howBody.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              </AtmosphereSection>

              <InsightNotifications
                conditions={c}
                insights={insights.data}
                forecastHours={forecastHours}
                officialLinks={officialLinks}
              />

              <InsightMetricCards conditions={c} insights={insights} />
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
