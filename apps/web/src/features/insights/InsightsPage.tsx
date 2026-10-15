import { DataStateBadge } from '@/components/DataStateBadge';
import { DemoBanner } from '@/components/DemoBanner';
import { QueryState } from '@/components/QueryState';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useCopy } from '@/lib/i18n';
import { useForecast, useInsights } from '@/lib/queries';
import { FactorList } from './FactorList';
import { ForecastChart } from './ForecastChart';

export default function InsightsPage() {
  const t = useCopy();
  const insights = useInsights();
  const forecast = useForecast(24);

  return (
    <div className="mx-auto w-full max-w-[1344px] space-y-4 px-4 pb-28 pt-2 md:px-6 lg:px-8 lg:pb-12">
      <h1 className="pt-2 font-heading text-3xl font-bold tracking-tight">{t.insights.title}</h1>

      <QueryState query={insights}>
        {(i) => (
          <>
            {i.state === 'demo' && <DemoBanner />}

            <Card>
              <CardHeader>
                <CardTitle>
                  {t.insights.chartTitle}{' '}
                  <span className="normal-case tracking-normal">({t.today.unit})</span>
                </CardTitle>
                <DataStateBadge state={i.state} />
              </CardHeader>
              <QueryState query={forecast}>
                {(f) => (
                  <ForecastChart hours={f.hours} timeZone={i.location.timezone} nowLabel={t.insights.nowMarker} />
                )}
              </QueryState>
            </Card>

            <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>{t.insights.factorsTitle}</CardTitle>
                </CardHeader>
                <FactorList factors={i.factors} timeZone={i.location.timezone} />
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.insights.methodTitle}</CardTitle>
                  <Badge variant="muted">{i.model.method}</Badge>
                </CardHeader>
                {/* SHAP / intervals render only when model.evaluated is true — never faked. */}
                <p className="text-sm">{t.insights.methodDeterministic}</p>
                <details className="mt-3 rounded-xl bg-surface-muted p-3 text-sm">
                  <summary className="cursor-pointer font-medium">{t.insights.howTitle}</summary>
                  <ul className="mt-2 list-disc space-y-2 pl-5 text-ink-muted">
                    {t.insights.howBody.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </details>
              </Card>
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}
