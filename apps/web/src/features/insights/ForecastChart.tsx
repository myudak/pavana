import type { ForecastHour } from '@pavana/shared';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, formatTime } from '@/lib/format';

/** PM2.5 forecast line. Units in the title; null hours render as gaps, not zeros. */
export function ForecastChart({ hours, timeZone }: { hours: ForecastHour[]; timeZone: string }) {
  const data = hours.map((h) => ({
    t: formatTime(h.validAt, timeZone),
    pm25: h.airQuality.pm25UgM3,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="pm25Fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pv-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--pv-primary)" stopOpacity={0} />
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
            stroke="var(--pv-primary)"
            strokeWidth={2.5}
            fill="url(#pm25Fill)"
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
