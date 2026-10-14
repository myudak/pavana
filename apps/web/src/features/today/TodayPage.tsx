import { ArrowRight, Info } from 'lucide-react';
import { Link } from 'react-router';
import { AqCategoryPill } from '@/components/AqCategoryPill';
import { DataStateBadge } from '@/components/DataStateBadge';
import { DemoBanner } from '@/components/DemoBanner';
import { ProvenanceNote } from '@/components/ProvenanceNote';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { FactorList } from '@/features/insights/FactorList';
import { AQ_STYLE, categoryOf } from '@/lib/aq';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { HourlyTimeline } from './HourlyTimeline';

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
                <p className="text-sm text-ink-muted">
                  {c.location.name}
                  {c.location.admin2 ? `, ${c.location.admin2}` : ''}
                </p>
                <h1 className="font-display text-3xl font-medium leading-tight tracking-tight">
                  {t.trendHeadline[c.trend]}
                </h1>
              </header>

              <Card className={cn('relative overflow-hidden', AQ_STYLE[cat].soft)}>
                <CardHeader>
                  <CardTitle>{t.today.currentTitle}</CardTitle>
                  <DataStateBadge state={c.state} />
                </CardHeader>
                {c.airQuality.pm25UgM3 === null ? (
                  <p className="text-ink-muted">{t.today.noData}</p>
                ) : (
                  <div className="space-y-3">
                    <p className="flex items-baseline gap-2">
                      <span className="font-display text-6xl font-medium tabular-nums tracking-tight">
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
                )}
                <ProvenanceNote
                  provenance={c.airQuality.provenance}
                  timeZone={tz}
                  className="mt-4"
                />
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.today.timelineTitle}</CardTitle>
                </CardHeader>
                <QueryState query={forecast}>
                  {(f) => <HourlyTimeline hours={f.hours} timeZone={tz} />}
                </QueryState>
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
                </ul>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                  <Info className="size-3.5" aria-hidden /> {t.today.actionsNote}{' '}
                  <Link to="/info" className="underline">
                    {t.info.linksTitle}
                  </Link>
                </p>
              </Card>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
