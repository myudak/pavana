import type { ForecastHour, ProvenanceKind } from '@pavana/shared';
import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ProvenanceChip } from '@/components/ProvenanceChip';
import { formatDateTime, formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
  availableRanges,
  dominantKind,
  hasPm25Data,
  seriesRole,
  sliceRange,
  summarizePm25,
  type ChartRange,
} from './insight-derive';

interface ChartPoint {
  x: number;
  iso: string;
  measurement: number | null;
  model: number | null;
  kind: ProvenanceKind;
  provider: string;
  isDemo: boolean;
}

interface AxisInfo {
  labels: string[];
  ticks: number[];
}

/** Time-axis labels (~8 marks, dates added at day boundaries) and tick indices. */
function buildAxis(points: ChartPoint[], timeZone: string): AxisInfo {
  const labels = points.map((p) => formatTime(p.iso, timeZone));
  if (points.length === 0) return { labels, ticks: [] };

  const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone }); // YYYY-MM-DD
  const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone });
  const dayKeys = points.map((p) => dayFmt.format(new Date(p.iso)));
  const isDayStart = (i: number) => i === 0 || dayKeys[i] !== dayKeys[i - 1];
  for (let i = 0; i < points.length; i += 1) {
    if (isDayStart(i) && i > 0) {
      labels[i] = `${dateFmt.format(new Date(points[i]!.iso))} ${labels[i]}`;
    }
  }

  const firstMs = Date.parse(points[0]!.iso);
  const offsetH = (i: number) => Math.round((Date.parse(points[i]!.iso) - firstMs) / 3_600_000);
  const spanH = offsetH(points.length - 1);
  const step = spanH <= 26 ? 3 : spanH <= 50 ? 6 : 24;
  const collect = (s: number) =>
    points.flatMap((_, i) => (i === 0 || isDayStart(i) || offsetH(i) % s === 0 ? [i] : []));

  let ticks = collect(step);
  if (ticks.length > 10) ticks = collect(step * 2);
  if (ticks.length > 10) ticks = collect(step * 4);
  return { labels, ticks };
}

function Pm25Tooltip({
  active,
  point,
  timeZone,
}: {
  active?: boolean | undefined;
  point: ChartPoint | null;
  timeZone: string;
}) {
  const t = useCopy();
  if (!active || !point) return null;
  const value = point.measurement ?? point.model;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-ink">{formatDateTime(point.iso, timeZone)}</p>
      <p className="mt-1 font-heading text-sm font-semibold tabular-nums text-ink">
        {formatNumber(value)} µg/m³
      </p>
      <p className="mt-1 text-ink-muted">
        {t.insights.chart.tooltipType}: {t.insights.chart.dataType[point.kind]}
      </p>
      <p className="text-ink-muted">
        {t.common.source}: {point.provider}
      </p>
      {point.isDemo && <p className="mt-0.5 text-state-demo">{t.insights.chart.illustrativeTag}</p>}
    </div>
  );
}

/**
 * Main PM2.5 time-series card: range selector (only for ranges whose data
 * exists), measurement vs model legend, now marker, full tooltip and an empty
 * state. Loading/error are handled by the QueryState wrapper in the page.
 */
export function PM25TimeSeries({
  hours,
  timeZone,
}: {
  hours: readonly ForecastHour[];
  timeZone: string;
}) {
  const t = useCopy();
  const [range, setRange] = useState<ChartRange>(24);

  const available = useMemo(() => availableRanges(hours), [hours]);
  const activeRange: ChartRange = available.includes(range) ? range : (available[0] ?? 24);
  const shown = useMemo(() => sliceRange(hours, activeRange), [hours, activeRange]);

  const { points, axis, measurementKind, modelKind } = useMemo(() => {
    const pts: ChartPoint[] = shown.map((h, i) => {
      const v = h.airQuality.pm25UgM3;
      const kind = h.airQuality.provenance.kind;
      const measured = seriesRole(kind) === 'measurement';
      return {
        x: i,
        iso: h.validAt,
        measurement: measured ? v : null,
        model: measured ? null : v,
        kind,
        provider: h.airQuality.provenance.provider,
        isDemo: h.airQuality.provenance.isDemo,
      };
    });
    return {
      points: pts,
      axis: buildAxis(pts, timeZone),
      measurementKind: dominantKind(shown, 'measurement'),
      modelKind: dominantKind(shown, 'model'),
    };
  }, [shown, timeZone]);

  const firstProv = shown[0]?.airQuality.provenance;
  const nowValue = shown[0]?.airQuality.pm25UgM3 ?? null;
  const summary = useMemo(() => summarizePm25(shown), [shown]);
  const peakIndex = useMemo(() => {
    let best = -1;
    shown.forEach((h, i) => {
      const v = h.airQuality.pm25UgM3;
      if (v !== null && (best === -1 || v > (shown[best]?.airQuality.pm25UgM3 ?? -Infinity))) best = i;
    });
    return best;
  }, [shown]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {summary ? (
          <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
            <div className="flex items-baseline gap-1.5">
              <dt>{t.insights.chart.statsMin}</dt>
              <dd className="font-heading text-sm font-semibold tabular-nums text-ink">
                {formatNumber(summary.min, 1)}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>{t.insights.chart.statsAvg}</dt>
              <dd className="font-heading text-sm font-semibold tabular-nums text-ink">
                {formatNumber(summary.avg, 1)}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>{t.insights.chart.statsPeak}</dt>
              <dd className="font-heading text-sm font-semibold tabular-nums text-warning-strong">
                {formatNumber(summary.peak.pm25UgM3, 1)}
              </dd>
              <span className="text-ink-muted">{formatTime(summary.peak.validAt, timeZone)}</span>
            </div>
          </dl>
        ) : (
          <span />
        )}
        {available.length >= 2 ? (
          <div
            role="group"
            aria-label={t.insights.chart.rangesLabel}
            className="flex rounded-full bg-surface-muted p-1"
          >
            {available.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={activeRange === r}
                onClick={() => setRange(r)}
                className={cn(
                  'min-h-11 rounded-full px-4 text-sm font-medium transition-colors',
                  activeRange === r
                    ? 'bg-surface text-ink shadow-sm'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {t.insights.chart.ranges[r]}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          {measurementKind && (
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-0.5 w-4 rounded-full bg-accent" />
              {t.insights.chart.legendMeasurement}
            </li>
          )}
          {modelKind && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block w-4 border-t-2 border-dashed border-primary"
              />
              {t.insights.chart.dataType[modelKind]}
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-3.5 w-0.5 border-l-2 border-dashed border-ink-muted"
            />
            {t.insights.chart.legendNow}
          </li>
        </ul>
      </div>

      {hasPm25Data(shown) ? (
        <div
          role="img"
          aria-label={t.insights.chart.srLabel(points.length)}
          className="h-64 w-full sm:h-72 lg:h-80"
        >
          <ResponsiveContainer>
            <ComposedChart data={points} margin={{ top: 20, right: 8, bottom: 4, left: -14 }}>
              <CartesianGrid stroke="var(--pv-border)" vertical={false} />
              <XAxis
                dataKey="x"
                type="number"
                domain={[0, Math.max(points.length - 1, 1)]}
                ticks={axis.ticks}
                tickFormatter={(v: number) => axis.labels[v] ?? ''}
                tick={{ fill: 'var(--pv-ink-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                domain={[0, 'auto']}
                allowDecimals={false}
                width={36}
                tick={{ fill: 'var(--pv-ink-muted)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: 'var(--pv-ink-muted)', strokeDasharray: '4 4' }}
                content={({ active, payload }) => (
                  <Pm25Tooltip
                    active={active}
                    point={(payload?.[0]?.payload as ChartPoint | undefined) ?? null}
                    timeZone={timeZone}
                  />
                )}
              />
              <ReferenceLine
                x={0}
                stroke="var(--pv-ink-muted)"
                strokeDasharray="4 4"
                label={{
                  value: t.insights.chart.legendNow,
                  position: 'top',
                  fill: 'var(--pv-ink-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              {nowValue !== null && (
                <ReferenceDot
                  x={0}
                  y={nowValue}
                  r={4}
                  fill="var(--pv-accent)"
                  stroke="var(--pv-surface)"
                  strokeWidth={2}
                  className="animate-pulse"
                />
              )}
              {summary && peakIndex > 0 && (
                <ReferenceDot
                  x={peakIndex}
                  y={summary.peak.pm25UgM3}
                  r={4}
                  fill="var(--pv-primary)"
                  stroke="var(--pv-surface)"
                  strokeWidth={2}
                  label={{
                    value: `${t.insights.chart.statsPeak} ${formatNumber(summary.peak.pm25UgM3, 1)}`,
                    position: 'top',
                    fill: 'var(--pv-primary)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="model"
                stroke="var(--pv-primary)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                fill="var(--pv-primary)"
                fillOpacity={0.12}
                connectNulls={false}
                animationDuration={700}
                dot={{ r: 2, fill: 'var(--pv-primary)', strokeWidth: 0 }}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              {measurementKind && (
                <Line
                  type="monotone"
                  dataKey="measurement"
                  stroke="var(--pv-accent)"
                  strokeWidth={2.5}
                  connectNulls={false}
                  animationDuration={700}
                  dot={{ r: 2, fill: 'var(--pv-accent)', strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-2xl bg-surface-muted px-4 text-center text-sm text-ink-muted">
          {t.insights.chart.empty}
        </div>
      )}

      {firstProv && <ProvenanceChip provenance={firstProv} timeZone={timeZone} className="mt-2" />}
    </div>
  );
}
