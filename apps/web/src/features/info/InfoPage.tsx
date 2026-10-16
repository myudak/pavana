import {
  ArrowUpRight01Icon,
  ComputerIcon,
  Moon02Icon,
  Notification03Icon,
  Sun03Icon,
} from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { AlertTriangle } from '@/components/icons';
import { AtmosphereSection } from '@/components/AtmosphereSection';
import { DataStateBadge } from '@/components/DataStateBadge';
import { DemoBanner } from '@/components/DemoBanner';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { factorNumber } from '@/features/insights/insight-derive';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useCopy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights, useOfficialLinks } from '@/lib/queries';
import { useTheme, type ThemePref } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { NotificationSettings } from '@/features/notifications/NotificationSettings';
import { DataModePanel, SourcesPanel } from './DataPanels';
import { InfoCardGrid } from './InfoCards';
import {
  deriveInfoCards,
  filterInfoCards,
  hasDataWarning,
  INFO_FILTERS,
  type InfoFilter,
} from './info-derive';

const THEME_ICON = { light: Sun03Icon, dark: Moon02Icon, system: ComputerIcon } as const;

/**
 * Info = a filterable summary dashboard of the same data the other pages show
 * (ported from Olive's Info redesign), then official links, data mode and sources,
 * planned alerts, theme, about. Never show fake official warnings here; alerts are
 * marked as not built yet.
 */
export function InfoPage() {
  const t = useCopy();
  const links = useOfficialLinks();
  const conditions = useConditions();
  const forecast = useForecast(48);
  const insights = useInsights();
  const { pref, setPref } = useTheme();
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
    <div className="mx-auto w-full max-w-[84rem] space-y-4 px-4 pb-28 pt-2 md:px-6 lg:px-8 lg:pb-12">
      {conditions.data?.state === 'demo' && <DemoBanner />}
      <AtmosphereSection labelledBy="info-title" className="scroll-mt-24">
      <header className="flex flex-wrap items-start justify-between gap-3 pb-1 pt-2">
        <div className="space-y-1">
        <h1 id="info-title" className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {t.info.title}
        </h1>
        <p className="max-w-2xl text-sm text-ink md:text-base">{t.info.subtitle}</p>
        </div>
        {conditions.data && <DataStateBadge state={conditions.data.state} />}
      </header>

      {staleWarning && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-warning-soft px-3 py-2 text-sm text-warning-ink ring-1 ring-warning/40"
        >
          <AlertTriangle className="size-4" />
          {t.info.staleWarning}
        </p>
      )}

      <div className="glass flex flex-wrap items-center justify-between gap-2 rounded-3xl p-2">
        <div
          role="group"
          aria-label={t.info.filtersLabel}
          className="flex flex-wrap gap-1 rounded-full bg-foreground/5 p-1"
        >
          {INFO_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'h-9 rounded-full px-3 text-[13px] font-medium transition-colors',
                filter === f
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.info.filters[f]}
            </button>
          ))}
        </div>
        <LocationPicker />
      </div>

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
      </AtmosphereSection>

      <div className="grid items-start gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title={t.info.linksTitle} className="order-2 lg:order-1">
          <QueryState query={links} inline>
            {(d) => (
              <ul className="divide-y divide-foreground/10">
                {d.links.map((l) => (
                  <li key={l.id}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between gap-3 py-3 first:pt-0"
                    >
                      <span className="min-w-0">
                        <span className="font-medium group-hover:underline">{l.title}</span>
                        <span className="text-muted-foreground"> · {l.publisher}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                          {l.description}
                        </span>
                      </span>
                      <Icon
                        icon={ArrowUpRight01Icon}
                        className="mt-0.5 size-4 text-muted-foreground"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </Panel>

        <div className="order-1 space-y-4 lg:order-2">
          <DataModePanel />
          <SourcesPanel />
          <Panel>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/5">
                <Icon icon={Notification03Icon} className="text-muted-foreground" />
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{t.alerts.title}</h2>
                  <span className="rounded-full bg-state-demo/15 px-2 py-0.5 text-[11px] font-semibold text-state-demo ring-1 ring-state-demo/30">
                    {t.alerts.status}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{t.alerts.body}</p>
              </div>
            </div>
            <NotificationSettings className="mt-4" />
          </Panel>

          <Panel title={t.info.theme}>
            <ToggleGroup
              type="single"
              value={pref}
              onValueChange={(v) => v && setPref(v as ThemePref)}
              className="w-full rounded-full bg-foreground/5 p-1"
              aria-label={t.info.theme}
            >
              {(['light', 'dark', 'system'] as ThemePref[]).map((p) => (
                <ToggleGroupItem
                  key={p}
                  value={p}
                  className="h-9 flex-1 gap-1.5 rounded-full data-[state=on]:bg-card data-[state=on]:shadow-sm"
                >
                  <Icon icon={THEME_ICON[p]} className="size-4" />
                  {t.info.themeOptions[p]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Panel>

          <Panel title={t.info.aboutTitle}>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.info.aboutBody}</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
