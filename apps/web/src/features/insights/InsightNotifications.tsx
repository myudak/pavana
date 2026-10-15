import type {
  ConditionsResponse,
  ForecastHour,
  InsightsResponse,
  OfficialLink,
  OfficialLinksResponse,
} from '@pavana/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Flame,
  Info,
  Landmark,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { AtmosphereSection } from '@/components/AtmosphereSection';
import { PriorityBadge, PriorityIcon } from '@/components/PriorityMarker';
import { PRIORITY_TIER } from '@/components/priority-tier';
import { formatDateTime, formatNumber, formatTime, tzAbbr } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { windDirectionLabel } from '@/lib/wind-label';
import {
  deriveNotifications,
  factorNumber,
  peakOf,
  type NotificationId,
  type RecommendationVars,
} from './insight-derive';

/** Curated link ids surfaced first on the official card (ids come from the API list). */
const OFFICIAL_FIRST = ['sipongi', 'bmkg-spartan'];
const OFFICIAL_SHOWN = 2;

const ICON: Record<NotificationId, LucideIcon> = {
  combined: ShieldAlert,
  'pm25-rise': TrendingUp,
  hotspots: Flame,
  official: Landmark,
  'data-stale': Clock,
  'data-insufficient': Info,
};

/** Keep the curated karhutla links first, then fill from the rest of the list. */
function pickOfficialLinks(links: readonly OfficialLink[]): OfficialLink[] {
  const preferred = OFFICIAL_FIRST.map((id) => links.find((l) => l.id === id)).filter(
    (l): l is OfficialLink => l !== undefined,
  );
  const rest = links.filter((l) => !OFFICIAL_FIRST.includes(l.id));
  return [...preferred, ...rest].slice(0, OFFICIAL_SHOWN);
}

/**
 * Prominent notification panel — the largest section after the chart. Up to three
 * items (combined PM2.5/hotspot/wind, PM2.5 rise, hotspots, official links, limited
 * data) with icon, time, summary, priority badge and an expandable deterministic
 * recommendation: triggering condition, reasons, actions and data limits. Nothing
 * is invented; each item and action maps to rules in lib/i18n/id.ts.
 */
export function InsightNotifications({
  conditions,
  insights,
  forecastHours,
  officialLinks,
}: {
  conditions: ConditionsResponse;
  insights: InsightsResponse | undefined;
  forecastHours: readonly ForecastHour[];
  officialLinks: UseQueryResult<OfficialLinksResponse>;
}) {
  const t = useCopy();
  const n = t.insights.notif;
  const rec = t.insights.rec;
  const timeZone = conditions.location.timezone;

  const hotspotFactor = insights?.factors.find((f) => f.id === 'upwind_hotspots');
  const windFactor = insights?.factors.find((f) => f.id === 'wind');
  const hotspotCount = factorNumber(hotspotFactor, 'consideredCount');
  const contributingCount = factorNumber(hotspotFactor, 'contributingCount');
  const radiusKm = factorNumber(hotspotFactor, 'radiusKm');
  const windowHours = factorNumber(hotspotFactor, 'windowHours');
  const windFromDeg = factorNumber(windFactor, 'directionFromDeg');
  const detectionAt = hotspotFactor?.provenance[0]?.validAt ?? null;

  const notifications = deriveNotifications({
    trend: conditions.trend,
    hotspotCount,
    windRelevant: contributingCount !== null && contributingCount > 0,
    state: conditions.state,
  });

  const peak = peakOf(forecastHours);
  const links = officialLinks.data?.links ?? [];
  const shownLinks = pickOfficialLinks(links);
  const isDemo =
    conditions.airQuality.provenance.isDemo ||
    Boolean(hotspotFactor?.provenance[0]?.isDemo) ||
    Boolean(windFactor?.provenance[0]?.isDemo);

  const windFrom = windDirectionLabel(windFromDeg) ?? '';

  const vars: RecommendationVars = {
    peakUgM3: peak ? formatNumber(peak.pm25UgM3, 1) : '',
    peakAt: peak ? `${formatTime(peak.validAt, timeZone)} ${tzAbbr(timeZone)}` : '',
    hotspotCount: hotspotCount !== null ? formatNumber(hotspotCount) : '',
    radiusKm: radiusKm !== null ? formatNumber(radiusKm) : '',
    windowHours: windowHours !== null ? formatNumber(windowHours) : '',
    windFrom,
    detectionAt: detectionAt ? formatDateTime(detectionAt, timeZone) : '',
    updatedAt: formatDateTime(conditions.airQuality.provenance.validAt, timeZone),
  };

  const title: Record<NotificationId, string> = {
    combined: n.combinedTitle,
    'pm25-rise': n.pm25RiseTitle,
    hotspots: n.hotspotTitle,
    official: n.officialTitle,
    'data-stale': n.staleTitle,
    'data-insufficient': n.insufficientTitle,
  };

  const summary: Record<NotificationId, string> = {
    combined: n.combinedBody,
    'pm25-rise': n.pm25Body,
    hotspots: n.hotspotBody(vars.hotspotCount),
    official: officialLinks.isError || shownLinks.length === 0 ? n.officialError : n.officialBody,
    'data-stale': n.staleBody,
    'data-insufficient': n.insufficientBody,
  };

  const timeLine: Record<NotificationId, { label: string; at: string } | null> = {
    combined: { label: n.validTime, at: vars.updatedAt },
    'pm25-rise': { label: n.validTime, at: vars.updatedAt },
    hotspots: vars.detectionAt ? { label: n.detectTime, at: vars.detectionAt } : null,
    official: { label: t.info.linksTitle, at: '' },
    'data-stale': null,
    'data-insufficient': null,
  };

  return (
    <AtmosphereSection labelledBy="notif-title">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="notif-title" className="font-heading text-xl font-semibold tracking-tight">
          {n.title}
        </h2>
        <p className="text-sm text-ink-muted">{n.subtitle}</p>
      </div>

      <ul className="grid items-start gap-3 md:grid-cols-2 lg:grid-cols-3">
        {notifications.map((item) => {
          const Icon = ICON[item.id];
          const tier = PRIORITY_TIER[item.priority];
          const rule = rec.rules[item.id];
          const time = timeLine[item.id];
          return (
            <li
              key={item.id}
              className={cn(
                'group/card flex flex-col gap-2 rounded-2xl border bg-surface/70 p-4 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg dark:bg-[var(--pv-glass)]',
                tier.border,
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <PriorityIcon priority={item.priority} icon={Icon} pulse />
                <PriorityBadge priority={item.priority} />
              </div>

              <p className="font-heading text-base font-semibold leading-snug">{title[item.id]}</p>

              {time && (
                <p className="text-xs text-ink-muted">
                  {time.label}
                  {time.at ? ` ${time.at}` : ''}
                </p>
              )}

              <p className="text-sm text-ink-muted">{summary[item.id]}</p>

              {item.id === 'official' && shownLinks.length > 0 && (
                <ul className="space-y-1">
                  {shownLinks.map((l) => (
                    <li key={l.id}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-11 items-start gap-2 text-sm hover:opacity-80"
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{l.title}</span>
                          <span className="text-ink-muted"> · {l.publisher}</span>
                        </span>
                        <ExternalLink className="mt-1 size-4 shrink-0 text-ink-muted" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <details className="group mt-auto border-t border-border pt-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary-strong">
                  {rec.open}
                  <ChevronDown
                    className="size-4 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>

                <div className="space-y-2 pt-2 text-sm group-open:animate-[pv-fade-up_220ms_ease-out_both]">
                  <p className="text-xs text-ink-muted">
                    {rule.trigger(vars)} {rule.reason(vars)}
                  </p>

                  <ul className="space-y-1.5">
                    {rule.actions.map((action) => (
                      <li key={action} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-xs text-ink-muted">
                    {rule.limit}
                    {isDemo ? ` · ${rec.illustrativeNote}` : ''}
                  </p>
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-ink-muted">{n.note}</p>
    </AtmosphereSection>
  );
}
