import type { ForecastHour } from '@pavana/shared';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

/** Mini PM2.5 sparkline from real forecast hours. Nulls render as gaps, not zeros. */
export function HeroSparkline({ hours }: { hours: ForecastHour[] }) {
  const data = hours.map((h) => ({ pm25: h.airQuality.pm25UgM3 }));
  if (data.every((d) => d.pm25 === null)) return null;
  return (
    <div className="h-14 w-36 shrink-0" aria-hidden>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--pv-accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--pv-accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="pm25"
            stroke="var(--pv-accent)"
            strokeWidth={2}
            dot={false}
            fill="url(#heroSparkFill)"
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
