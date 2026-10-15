import type { ForecastHour } from '@pavana/shared';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, formatTime } from '@/lib/format';

/** PM2.5 forecast line. Units in the title; null hours render as gaps, not zeros. */
export function ForecastChart({
  hours,
  timeZone,
  nowLabel,
}: {
  hours: ForecastHour[];
  timeZone: string;
  nowLabel: string;
}) {
  const data = hours.map((h) => ({
    t: formatTime(h.validAt, timeZone),
    pm25: h.airQuality.pm25UgM3,
  }));
  const first = data[0];
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 16, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pv-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--pv-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pm25Stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--pv-primary)" />
              <stop offset="100%" stopColor="var(--pv-accent)" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--pv-border)" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ fill: 'var(--pv-ink-muted)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={5}
          />
          <YAxis
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
            formatter={(v) => [`${formatNumber(v as number)} µg/m³`, 'PM2.5']}
          />
          <Area
            type="monotone"
            dataKey="pm25"
            stroke="url(#pm25Stroke)"
            strokeWidth={2.5}
            strokeDasharray="1 6"
            strokeLinecap="round"
            dot={{ r: 2.5, fill: 'var(--pv-primary)', strokeWidth: 0 }}
            activeDot={{ r: 4, fill: 'var(--pv-accent)', strokeWidth: 0 }}
            fill="url(#pm25Fill)"
            connectNulls={false}
          />
          {first && first.pm25 !== null && (
            <ReferenceDot
              x={first.t}
              y={first.pm25}
              r={6}
              fill="var(--pv-accent)"
              stroke="var(--pv-surface)"
              strokeWidth={2}
              label={{
                value: nowLabel,
                position: 'top',
                fill: 'var(--pv-accent)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
