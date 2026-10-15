import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { AtmosphereSection } from '@/components/AtmosphereSection';
import { DataStateBadge } from '@/components/DataStateBadge';
import { DemoBanner } from '@/components/DemoBanner';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { factorNumber } from '@/features/insights/insight-derive';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useCopy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights, useOfficialLinks } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { InfoCardGrid } from './InfoCards';
import {
  deriveInfoCards,
  filterInfoCards,
  hasDataWarning,
  INFO_FILTERS,
  type InfoFilter,
} from './info-derive';

/**
 * Info dashboard: the same data the other pages show, summarised as cards with a
 * category filter and the active location, plus the curated official links and the
 * about note. The whole dashboard sits on the atmospheric backdrop (dawn art in
 * light mode, dusk art in dark). Theme switching lives in the shell header.
 */
export function InfoPage() {
  const t = useCopy();
  const conditions = useConditions();
  const forecast = useForecast(48);
  const insights = useInsights();
  const links = useOfficialLinks();
  const [filter, setFilter] = useState<InfoFilter>('all');

  const hotspotFactor = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
  const descriptors = deriveInfoCards({
    trend: conditions.data?.trend ?? 'unknown',
    hotspotCount: factorNumber(hotspotFactor, 'consideredCount'),
    linkCount: links.data?.links.length ?? 0,
    dataState: conditions.data?.state ?? 'insufficient',
  });
  const visible = filterInfoCards(descriptors, filter);
  const staleWarning = conditions.data ? hasDataWarning(conditions.data.state) : false;

  const refreshAll = () => {
    void conditions.refetch();
    void forecast.refetch();
    void insights.refetch();
    void links.refetch();
  };

  return (
    <div className="space-y-4">
      {conditions.data?.state === 'demo' && <DemoBanner />}

      <AtmosphereSection labelledBy="info-title" className="scroll-mt-24">
        <header className="flex flex-wrap items-start justify-between gap-3 pb-1 pt-2">
          <div className="space-y-1">
            <h1
              id="info-title"
              className="font-heading text-3xl font-semibold tracking-tight md:text-4xl"
            >
              {t.info.title}
            </h1>
            <p className="max-w-2xl text-sm text-ink md:text-base">{t.info.subtitle}</p>
          </div>
          {conditions.data && <DataStateBadge state={conditions.data.state} />}
        </header>

        {staleWarning && (
          <p
            role="status"
            className="mt-3 flex items-center gap-2 rounded-2xl border border-warning/50 bg-warning-soft px-3 py-2 text-sm text-warning-ink"
          >
            <AlertTriangle className="size-4 shrink-0 animate-pulse" aria-hidden />
            {t.info.staleWarning}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/70 p-2 backdrop-blur transition-shadow duration-200 focus-within:shadow-md hover:shadow-md">
          <div
            role="group"
            aria-label={t.info.filtersLabel}
            className="flex flex-wrap gap-1 rounded-full bg-surface-muted p-1"
          >
            {INFO_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'min-h-11 rounded-full px-3 text-sm font-medium transition-all duration-200',
                  filter === f
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {t.info.filters[f]}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 items-center gap-2 pl-1">
            <span className="text-xs uppercase tracking-[0.12em] text-ink-muted">
              {t.info.locationLabel}
            </span>
            <LocationPicker />
          </div>
        </div>

        <div className="mt-4">
          <QueryState query={conditions}>
            {(c) => (
              <InfoCardGrid
                descriptors={visible}
                conditions={c}
                forecast={forecast}
                insights={insights}
                links={links}
                onRefresh={refreshAll}
              />
            )}
          </QueryState>
        </div>
      </AtmosphereSection>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card id="tautan-resmi" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>{t.info.linksTitle}</CardTitle>
          </CardHeader>
          <QueryState query={links}>
            {(d) => (
              <ul className="divide-y divide-border">
                {d.links.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 items-start justify-between gap-3 py-3 transition-opacity hover:opacity-80"
                    >
                      <span>
                        <span className="font-medium">{l.title}</span>
                        <span className="text-ink-muted"> · {l.publisher}</span>
                        <span className="block text-sm text-ink-muted">{l.description}</span>
                      </span>
                      <ExternalLink className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>{t.info.aboutTitle}</CardTitle>
          </CardHeader>
          <p className="text-sm text-ink-muted">{t.info.aboutBody}</p>
        </Card>
      </div>
    </div>
  );
}
