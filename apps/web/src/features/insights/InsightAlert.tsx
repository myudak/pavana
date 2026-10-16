import type { ConditionsResponse, ForecastHour } from '@pavana/shared';
import { AlertTriangle, BookOpen, Info } from '@/components/icons';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { bannerTone } from './insight-derive';

/**
 * Single top-of-page banner. Amber when the forecast worsens or data is stale,
 * neutral otherwise; insufficient data is stated plainly and never reads "safe".
 */
export function InsightAlert({
  conditions,
  forecastHours,
}: {
  conditions: ConditionsResponse;
  forecastHours: readonly ForecastHour[];
}) {
  const t = useCopy();
  const { location, state, airQuality, trend } = conditions;
  const timeZone = location.timezone;
  const prov = airQuality.provenance;
  const tone = bannerTone(trend, state);
  const a = t.insights.alert;

  // Status/limitation lines only — the forecast range is shown by the chart itself.
  let title: string;
  let body = '';
  if (state === 'insufficient') {
    title = a.insufficientTitle;
    body = a.insufficientBody;
  } else if (state === 'stale' || state === 'error') {
    title = a.staleTitle;
    body = a.staleBody;
  } else if (forecastHours.length === 0) {
    title =
      trend === 'worsening'
        ? a.worseningTitle
        : trend === 'improving'
          ? a.improvingTitle
          : trend === 'stable'
            ? a.stableTitle
            : a.unknownTitle;
    body = a.forecastPending;
  } else if (trend === 'worsening') {
    title = a.worseningTitle;
  } else if (trend === 'improving' || trend === 'stable') {
    title = trend === 'improving' ? a.improvingTitle : a.stableTitle;
  } else {
    title = a.unknownTitle;
    body = a.unknownBody;
  }

  const warning = tone === 'warning';
  const meta = `${a.updatedAt(formatDateTime(prov.validAt, timeZone))} · ${t.common.source}: ${prov.provider} · ${t.provenanceKind[prov.kind]}`;

  return (
    <aside
      className={cn(
        'flex flex-col gap-3 rounded-card border p-4 md:flex-row md:items-center md:justify-between',
        warning ? 'border-warning/50 bg-warning-soft' : 'border-border bg-surface-muted',
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {warning ? (
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 animate-pulse text-warning-strong"
            aria-hidden
          />
        ) : (
          <Info className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden />
        )}
        <div className="min-w-0 space-y-1">
          <p
            className={cn(
              'font-heading text-base font-semibold',
              warning ? 'text-warning-ink' : 'text-ink',
            )}
          >
            {title}
          </p>
          {body && (
            <p className={cn('text-sm', warning ? 'text-warning-ink' : 'text-ink-muted')}>{body}</p>
          )}
          <p className={cn('text-xs', warning ? 'text-warning-ink/80' : 'text-ink-muted')}>
            {meta}
          </p>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-2 md:flex">
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/peta">{a.seeMap}</Link>
        </Button>
        <Link
          to="/info"
          aria-label={a.officialGuide}
          title={a.officialGuide}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-ink-muted transition-colors hover:text-ink"
        >
          <BookOpen className="size-4" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}
