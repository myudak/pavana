import { Link } from 'react-router';
import { ArrowRight, Flame } from '@/components/icons';
import { DataStateBadge } from '@/components/DataStateBadge';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { compassId } from '@/lib/wind';
import { cn } from '@/lib/utils';
import { TREND_URL } from './trend-link';
import { useFirePoints } from './use-fire-points';

/** Detection time: relative within 24h, absolute otherwise (location time zone). */
function detectionLabel(acquiredAt: string, timeZone: string, t: ReturnType<typeof useCopy>): string {
  const ageMs = Date.now() - Date.parse(acquiredAt);
  if (Number.isFinite(ageMs) && ageMs >= 0) {
    const minutes = Math.floor(ageMs / 60_000);
    if (minutes < 1) return t.fire.justNow;
    if (minutes < 60) return t.fire.minutesAgo(minutes);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t.fire.hoursAgo(hours);
  }
  return formatDateTime(acquiredAt, timeZone);
}

/**
 * "Titik panas terdekat": 5 closest detections from the selected location,
 * each with distance (haversine), compass direction and detection time.
 * Same Card frame as the other widgets; wraps on 393px, same in light/dark.
 */
export function NearestHotspotsCard({
  showLink = true,
  className,
}: {
  /** Link to the full trend page (hidden on the trend page itself). */
  showLink?: boolean;
  className?: string;
}) {
  const t = useCopy();
  const f = t.fire;
  const fire = useFirePoints();
  const { query, nearest, total, radiusKm, windowHours, isDemo, timeZone } = fire;

  return (
    <Card className={cn('min-w-0 break-words', className)}>
      <CardHeader className="mb-2">
        <CardTitle className="min-w-0 flex-1 break-words">{f.nearestTitle}</CardTitle>
        {isDemo && <DataStateBadge state="demo" />}
      </CardHeader>
      <p className="break-words text-sm text-ink-muted">
        {total === null
          ? f.summaryUnknown
          : f.summary(formatNumber(total), formatNumber(radiusKm), formatNumber(windowHours))}
      </p>
      <QueryState query={query} inline>
        {() =>
          nearest.length === 0 ? (
            <p className="break-words text-sm text-ink-muted">{f.none}</p>
          ) : (
            <ul className="min-w-0 space-y-1">
              {nearest.map(({ hotspot, distanceKm, bearingDeg }) => (
                <li
                  key={hotspot.id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl py-2"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-exp-high/15">
                    <Flame className="size-5 text-exp-high" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className="block break-words text-sm font-medium tabular">
                      {f.km(formatNumber(Math.round(distanceKm)))} ·{' '}
                      {compassId(bearingDeg, t)}
                    </span>
                    <span className="block break-words text-xs text-muted-foreground">
                      {detectionLabel(hotspot.acquiredAt, timeZone, t)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )
        }
      </QueryState>
      <p className="break-words text-[11px] leading-relaxed text-muted-foreground">
        {f.disclaimer}
      </p>
      {showLink && (
        <div className="border-t border-hairline pt-2">
          <Link
            to={TREND_URL}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-strong"
          >
            {f.seeTrend} <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </Card>
  );
}
