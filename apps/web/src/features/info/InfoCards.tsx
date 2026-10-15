import type {
  ConditionsResponse,
  ForecastResponse,
  InsightsResponse,
  OfficialLink,
  OfficialLinksResponse,
} from '@pavana/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  ExternalLink,
  Flame,
  Landmark,
  RefreshCw,
  TrendingUp,
  type AppIcon,
} from '@/components/icons';
import { Link } from 'react-router';
import { DataStateBadge } from '@/components/DataStateBadge';
import { InfoChip } from '@/components/InfoChip';
import { PriorityBadge, PriorityIcon } from '@/components/PriorityMarker';
import { PRIORITY_TIER } from '@/components/priority-tier';
import { ProvenanceChip } from '@/components/ProvenanceChip';
import { QueryState } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { factorNumber, peakOf, summarizePm25 } from '@/features/insights/insight-derive';
import { formatDateTime, formatNumber, formatTime, tzAbbr } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { InfoCardDescriptor } from './info-derive';

/** Publishers shown first on the official card. */
const OFFICIAL_FIRST = ['bmkg-pm25', 'bpbd-kalbar'];
const OFFICIAL_SHOWN = 2;

const CARD = 'flex flex-col gap-2 rounded-card border bg-surface/70 p-4 backdrop-blur';
const CARD_MOTION =
  'animate-[pv-fade-up_260ms_ease-out_both] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg';

function DashboardCard({
  descriptor,
  title,
  icon,
  delayMs,
  children,
}: {
  descriptor: InfoCardDescriptor;
  title: string;
  icon: AppIcon;
  delayMs: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(CARD, CARD_MOTION, PRIORITY_TIER[descriptor.priority].border)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <PriorityIcon priority={descriptor.priority} icon={icon} pulse />
        <PriorityBadge priority={descriptor.priority} />
      </div>
      <p className="font-heading text-base font-semibold leading-snug">{title}</p>
      {children}
    </Card>
  );
}

function ActionLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong"
    >
      {children} <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

function pickLinks(links: readonly OfficialLink[]): OfficialLink[] {
  const preferred = OFFICIAL_FIRST.map((id) => links.find((l) => l.id === id)).filter(
    (l): l is OfficialLink => l !== undefined,
  );
  const rest = links.filter((l) => !OFFICIAL_FIRST.includes(l.id));
  return [...preferred, ...rest].slice(0, OFFICIAL_SHOWN);
}

function Pm25Card({
  descriptor,
  conditions,
  forecast,
  delayMs,
}: {
  descriptor: InfoCardDescriptor;
  conditions: ConditionsResponse;
  forecast: UseQueryResult<ForecastResponse>;
  delayMs: number;
}) {
  const t = useCopy();
  const c = t.info.cards;
  const timeZone = conditions.location.timezone;
  const hours = forecast.data?.hours ?? [];
  const peak = peakOf(hours);
  const summary = summarizePm25(hours);
  const firstProv = hours[0]?.airQuality.provenance;

  return (
    <DashboardCard descriptor={descriptor} title={c.pm25Title} icon={TrendingUp} delayMs={delayMs}>
      {forecast.isPending ? (
        <span className="h-5 w-3/4 animate-pulse rounded-full bg-surface-muted" aria-hidden />
      ) : peak && summary ? (
        <>
          <p className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
              {formatNumber(peak.pm25UgM3, 1)}
            </span>
            <span className="text-sm text-ink-muted">{t.today.unit}</span>
          </p>
          <p className="text-sm text-ink-muted">
            {c.pm25Body(
              formatNumber(peak.pm25UgM3, 1),
              `${formatTime(peak.validAt, timeZone)} ${tzAbbr(timeZone)}`,
            )}
          </p>
          <p className="text-xs text-ink-muted">
            {t.insights.chart.statsMin} {formatNumber(summary.min, 1)} · {t.insights.chart.statsAvg}{' '}
            {formatNumber(summary.avg, 1)}
          </p>
        </>
      ) : (
        <p className="text-sm text-ink-muted">{c.pm25Empty}</p>
      )}
      {firstProv && <ProvenanceChip provenance={firstProv} timeZone={timeZone} />}
      <ActionLink to="/insight">{c.pm25Action}</ActionLink>
    </DashboardCard>
  );
}

function HotspotCard({
  descriptor,
  insights,
  delayMs,
}: {
  descriptor: InfoCardDescriptor;
  insights: InsightsResponse;
  delayMs: number;
}) {
  const t = useCopy();
  const c = t.info.cards;
  const factor = insights.factors.find((f) => f.id === 'upwind_hotspots');
  const count = factorNumber(factor, 'consideredCount');
  const radiusKm = factorNumber(factor, 'radiusKm');
  const windowHours = factorNumber(factor, 'windowHours');
  const provenance = factor?.provenance[0];
  const timeZone = insights.location.timezone;

  return (
    <DashboardCard descriptor={descriptor} title={c.hotspotTitle} icon={Flame} delayMs={delayMs}>
      {count === null ? (
        <p className="text-sm text-ink-muted">{c.hotspotUnknown}</p>
      ) : count === 0 ? (
        <p className="text-sm text-ink-muted">{c.hotspotNone}</p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight">
              {formatNumber(count)}
            </span>
          </p>
          <p className="text-sm text-ink-muted">
            {radiusKm !== null && windowHours !== null
              ? c.hotspotBody(
                  formatNumber(count),
                  formatNumber(radiusKm),
                  formatNumber(windowHours),
                )
              : c.hotspotUnknown}
          </p>
        </>
      )}
      <InfoChip label={c.hotspotCaveat} detail={t.insights.rec.rules.hotspots.limit} />
      {count !== null && count > 0 && provenance && (
        <ProvenanceChip provenance={provenance} timeZone={timeZone} />
      )}
      <ActionLink to="/peta">{c.hotspotAction}</ActionLink>
    </DashboardCard>
  );
}

function OfficialCard({
  descriptor,
  links,
  delayMs,
}: {
  descriptor: InfoCardDescriptor;
  links: OfficialLink[];
  delayMs: number;
}) {
  const t = useCopy();
  const c = t.info.cards;
  const shown = pickLinks(links);

  return (
    <DashboardCard
      descriptor={descriptor}
      title={c.officialTitle}
      icon={Landmark}
      delayMs={delayMs}
    >
      <p className="text-sm text-ink-muted">
        {links.length > 0 ? c.officialBody(formatNumber(links.length)) : c.officialEmpty}
      </p>
      {shown.length > 0 && (
        <ul className="space-y-1">
          {shown.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${c.officialAction}: ${l.title} (${l.publisher})`}
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
      <InfoChip label={c.officialCaveat} detail={t.info.aboutBody} />
      <a
        href="#tautan-resmi"
        className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong"
      >
        {c.officialAll} <ArrowRight className="size-4" aria-hidden />
      </a>
    </DashboardCard>
  );
}

function DataStatusCard({
  descriptor,
  conditions,
  onRefresh,
  delayMs,
}: {
  descriptor: InfoCardDescriptor;
  conditions: ConditionsResponse;
  onRefresh: () => void;
  delayMs: number;
}) {
  const t = useCopy();
  const c = t.info.cards;
  const timeZone = conditions.location.timezone;
  const state = conditions.state;
  const summary =
    state === 'stale'
      ? c.dataStale
      : state === 'insufficient' || state === 'error'
        ? c.dataInsufficient
        : null;

  return (
    <DashboardCard descriptor={descriptor} title={c.dataTitle} icon={Activity} delayMs={delayMs}>
      <div className="flex flex-wrap items-center gap-2">
        <DataStateBadge state={state} />
        {summary && <span className="text-sm text-ink-muted">{summary}</span>}
      </div>
      {!summary && (
        <p className="text-sm text-ink-muted">
          {c.dataUpdated(formatDateTime(conditions.airQuality.provenance.validAt, timeZone))}
        </p>
      )}
      <ProvenanceChip provenance={conditions.airQuality.provenance} timeZone={timeZone} />
      <Button variant="outline" className="mt-auto min-h-11 self-start" onClick={onRefresh}>
        <RefreshCw aria-hidden /> {c.dataAction}
      </Button>
    </DashboardCard>
  );
}

/**
 * The four dashboard cards. Air/status read /conditions, the forecast card adds
 * its peak, hotspots come from the insights factors (server window + radius) and
 * the official card lists curated BPBD/BMKG links. Each slot owns its own
 * loading and error state.
 */
export function InfoCardGrid({
  descriptors,
  conditions,
  forecast,
  insights,
  links,
  onRefresh,
}: {
  descriptors: readonly InfoCardDescriptor[];
  conditions: ConditionsResponse;
  forecast: UseQueryResult<ForecastResponse>;
  insights: UseQueryResult<InsightsResponse>;
  links: UseQueryResult<OfficialLinksResponse>;
  onRefresh: () => void;
}) {
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      {descriptors.map((descriptor, index) => {
        const delayMs = index * 60;
        switch (descriptor.id) {
          case 'pm25':
            return (
              <Pm25Card
                key={descriptor.id}
                descriptor={descriptor}
                conditions={conditions}
                forecast={forecast}
                delayMs={delayMs}
              />
            );
          case 'hotspots':
            return (
              <QueryState key={descriptor.id} query={insights}>
                {(i) => <HotspotCard descriptor={descriptor} insights={i} delayMs={delayMs} />}
              </QueryState>
            );
          case 'official':
            return (
              <QueryState key={descriptor.id} query={links}>
                {(d) => <OfficialCard descriptor={descriptor} links={d.links} delayMs={delayMs} />}
              </QueryState>
            );
          case 'data':
            return (
              <DataStatusCard
                key={descriptor.id}
                descriptor={descriptor}
                conditions={conditions}
                onRefresh={onRefresh}
                delayMs={delayMs}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
