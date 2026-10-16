import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Minus, TrendingDown, TrendingUp } from '@/components/icons';
import { DataStateBadge } from '@/components/DataStateBadge';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatTimeRange } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { BUCKET_MS, TREND_BUCKETS } from './fire-points';
import { TREND_SECTION_ID } from './trend-link';
import { useFirePoints } from './use-fire-points';

const CHANGE_STYLE = {
  up: { Icon: TrendingUp, className: 'text-warning-strong' },
  down: { Icon: TrendingDown, className: 'text-aq-good' },
  flat: { Icon: Minus, className: 'text-ink-muted' },
} as const;

/**
 * "Tren titik panas": detections per 6h over the last 48h (8 bars) from the
 * same fixture/API source as the nearest list — total, peak (count + time)
 * and change vs the previous 24h. Same Recharts style as the PM2.5 chart.
 */
export function HotspotTrendCard({ className }: { className?: string }) {
  const t = useCopy();
  const f = t.fire;
  const fire = useFirePoints();
  const { query, buckets, summary, windowEnd, timeZone, isDemo } = fire;

  return (
    <Card
      id={TREND_SECTION_ID}
      className={cn(
        'min-w-0 scroll-mt-[calc(3.25rem+env(safe-area-inset-top)+1rem)] break-words lg:scroll-mt-[calc(var(--topbar-h)+1rem)]',
        className,
      )}
    >
      <CardHeader className="mb-2">
        <CardTitle className="min-w-0 flex-1 break-words">{f.trendTitle}</CardTitle>
        {isDemo && <DataStateBadge state="demo" />}
      </CardHeader>
      <QueryState query={query} inline>
        {() => {
          if (fire.hotspots.length === 0 || windowEnd === null) {
            return <p className="break-words text-sm text-ink-muted">{f.none}</p>;
          }
          const startMs = windowEnd - TREND_BUCKETS * BUCKET_MS;
          const data = buckets.map((count, i) => {
            const s = startMs + i * BUCKET_MS;
            const e = s + BUCKET_MS;
            return {
              label:
                i === buckets.length - 1
                  ? t.insights.nowMarker
                  : `-${(buckets.length - 1 - i) * 6}j`,
              range: formatTimeRange(
                new Date(s).toISOString(),
                new Date(e).toISOString(),
                timeZone,
              ),
              count,
            };
          });
          const last = data[data.length - 1]!;
          const peakStart = startMs + summary.peakIndex * BUCKET_MS;
          const peakEnd = peakStart + BUCKET_MS;
          const change = CHANGE_STYLE[summary.direction];
          const ChangeIcon = change.Icon;
          return (
            <div className="min-w-0 space-y-3">
              <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-2">
                <p className="min-w-0">
                  <span className="block break-words text-xs text-ink-muted">{f.trendTotal}</span>
                  <span className="font-heading text-3xl font-semibold tabular">
                    {formatNumber(summary.total)}
                  </span>
                </p>
                <p className="min-w-0">
                  <span className="block break-words text-xs text-ink-muted">{f.trendPeak}</span>
                  <span className="break-words text-sm font-medium tabular">
                    {formatNumber(summary.peakCount)} ·{' '}
                    {formatTimeRange(
                      new Date(peakStart).toISOString(),
                      new Date(peakEnd).toISOString(),
                      timeZone,
                    )}
                  </span>
                </p>
                <p
                  className={cn(
                    'flex min-w-0 items-center gap-1.5 text-sm font-medium',
                    change.className,
                  )}
                >
                  <ChangeIcon className="size-4 shrink-0" aria-hidden />
                  <span className="break-words">
                    {summary.direction === 'flat'
                      ? f.trendFlat
                      : summary.changePct === null
                        ? f.trendUpNoBase
                        : summary.direction === 'up'
                          ? f.trendUp(formatNumber(Math.abs(summary.changePct)))
                          : f.trendDown(formatNumber(Math.abs(summary.changePct)))}{' '}
                    <span className="font-normal text-ink-muted">· {f.trendVs}</span>
                  </span>
                </p>
              </div>
              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer>
                  <BarChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="var(--pv-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: 'var(--pv-ink-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval={1}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: 'var(--pv-ink-muted)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--pv-surface)',
                        border: '1px solid var(--pv-border)',
                        borderRadius: 12,
                        color: 'var(--pv-ink)',
                      }}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.range ?? ''}
                      formatter={(v) => [`${formatNumber(v as number)} ${f.detections}`, '']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === summary.peakIndex ? 'var(--pv-accent)' : 'var(--pv-primary)'}
                        />
                      ))}
                    </Bar>
                    <ReferenceDot
                      x={last.label}
                      y={last.count}
                      r={6}
                      fill="var(--pv-accent)"
                      stroke="var(--pv-surface)"
                      strokeWidth={2}
                      label={{
                        value: t.insights.nowMarker,
                        position: 'top',
                        fill: 'var(--pv-accent)',
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="break-words text-[11px] leading-relaxed text-muted-foreground">
                {f.disclaimer}
              </p>
            </div>
          );
        }}
      </QueryState>
    </Card>
  );
}
