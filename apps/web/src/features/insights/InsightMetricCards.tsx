import type { ConditionsResponse, Factor, InsightsResponse, Trend } from '@pavana/shared';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  ArrowRight,
  CircleHelp,
  Minus,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { AqCategoryPill } from '@/components/AqCategoryPill';
import { InfoChip } from '@/components/InfoChip';
import { ProvenanceChip } from '@/components/ProvenanceChip';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { categoryOf } from '@/lib/aq';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { bearingToCompass8, factorNumber } from './insight-derive';

/** Trend as a coloured glyph (text lives in the tooltip + screen-reader label). */
const TREND: Record<Trend, { Icon: LucideIcon; className: string }> = {
  worsening: { Icon: TrendingUp, className: 'text-warning-strong' },
  improving: { Icon: TrendingDown, className: 'text-aq-good' },
  stable: { Icon: Minus, className: 'text-ink-muted' },
  unknown: { Icon: CircleHelp, className: 'text-ink-muted' },
};

function TrendGlyph({ trend }: { trend: Trend }) {
  const t = useCopy();
  const { Icon, className } = TREND[trend];
  return (
    <span
      title={t.trendHeadline[trend]}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted',
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{t.trendHeadline[trend]}</span>
    </span>
  );
}

function AirCard({ conditions }: { conditions: ConditionsResponse }) {
  const t = useCopy();
  const timeZone = conditions.location.timezone;
  const pm25 = conditions.airQuality.pm25UgM3;
  return (
    <Card className="flex flex-col gap-2">
      <CardHeader className="mb-0">
        <CardTitle>{t.insights.cards.airTitle}</CardTitle>
      </CardHeader>
      {pm25 === null ? (
        <p className="text-sm text-ink-muted">{t.today.noData}</p>
      ) : (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
            {formatNumber(pm25)}
          </span>
          <span className="text-sm text-ink-muted">{t.today.unit}</span>
          <AqCategoryPill category={categoryOf(pm25)} />
          <TrendGlyph trend={conditions.trend} />
        </p>
      )}
      <ProvenanceChip provenance={conditions.airQuality.provenance} timeZone={timeZone} />
      <a
        href="#prakiraan-pm25"
        className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong"
      >
        {t.insights.cards.seeChart} <ArrowRight className="size-4" aria-hidden />
      </a>
    </Card>
  );
}

function WindCard({ factor, timeZone }: { factor: Factor | undefined; timeZone: string }) {
  const t = useCopy();
  const fromDeg = factorNumber(factor, 'directionFromDeg');
  const speedMs = factorNumber(factor, 'speedMs');
  const provenance = factor?.provenance[0];

  return (
    <Card className="flex flex-col gap-2">
      <CardHeader className="mb-0">
        <CardTitle>{t.insights.cards.windTitle}</CardTitle>
      </CardHeader>
      {fromDeg === null ? (
        <p className="text-sm text-ink-muted">{t.insights.cards.windMissing}</p>
      ) : (
        <>
          <p className="font-heading text-2xl font-semibold">
            {(() => {
              const compass = bearingToCompass8(fromDeg);
              return t.insights.cards.windFrom(t.insights.compass8[compass], compass);
            })()}
          </p>
          {speedMs !== null && (
            <p className="text-sm text-ink-muted">
              {t.insights.cards.windSpeed(String(Math.round(speedMs * 3.6)))}
            </p>
          )}
        </>
      )}
      <InfoChip
        label={t.insights.cards.windScope}
        detail={t.insights.cards.windRelevance}
      />
      {provenance && <ProvenanceChip provenance={provenance} timeZone={timeZone} />}
      <Link
        to="/peta"
        className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong"
      >
        {t.insights.cards.seeMap} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

function HotspotCard({ factor, timeZone }: { factor: Factor | undefined; timeZone: string }) {
  const t = useCopy();
  const count = factorNumber(factor, 'consideredCount');
  const radiusKm = factorNumber(factor, 'radiusKm');
  const windowHours = factorNumber(factor, 'windowHours');
  const provenance = count !== null && count > 0 ? factor?.provenance[0] : undefined;

  return (
    <Card className="flex flex-col gap-2">
      <CardHeader className="mb-0">
        <CardTitle>{t.insights.cards.hotspotTitle}</CardTitle>
      </CardHeader>
      {count === null ? (
        <p className="text-sm text-ink-muted">{t.insights.cards.hotspotError}</p>
      ) : count === 0 ? (
        <p className="text-sm text-ink-muted">{t.insights.cards.hotspotNone}</p>
      ) : (
        <>
          <p className="flex items-baseline gap-2">
            <span className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
              {formatNumber(count)}
            </span>
          </p>
          <p className="text-sm text-ink-muted">
            {radiusKm !== null && windowHours !== null
              ? t.insights.cards.hotspotScope(String(radiusKm), String(windowHours))
              : t.insights.cards.hotspotScopeArea}
          </p>
        </>
      )}
      {provenance && <ProvenanceChip provenance={provenance} timeZone={timeZone} />}
      <Link
        to="/peta"
        className="mt-auto inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong"
      >
        {t.insights.cards.seeMap} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}

/**
 * Three compact indicators under the chart. Air comes from /conditions;
 * wind and hotspots from /insights factors (server-computed window + radius,
 * each with its own provenance). Each slot owns its loading/error state.
 */
export function InsightMetricCards({
  conditions,
  insights,
}: {
  conditions: ConditionsResponse;
  insights: UseQueryResult<InsightsResponse>;
}) {
  const timeZone = conditions.location.timezone;
  return (
    <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AirCard conditions={conditions} />
      <QueryState query={insights}>
        {(i) => <WindCard factor={i.factors.find((f) => f.id === 'wind')} timeZone={timeZone} />}
      </QueryState>
      <QueryState query={insights}>
        {(i) => (
          <HotspotCard
            factor={i.factors.find((f) => f.id === 'upwind_hotspots')}
            timeZone={timeZone}
          />
        )}
      </QueryState>
    </div>
  );
}
