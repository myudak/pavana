import type { ForecastHour } from '@pavana/shared';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

/**
 * Mini PM2.5 sparkline from real forecast hours. Nulls render as gaps, not zeros.
 * Gradient stroke (primary-strong → accent) with a glowing accent end-dot.
 */
export function HeroSparkline({ hours, className }: { hours: ForecastHour[]; className?: string }) {
  const data = hours.map((h) => ({ pm25: h.airQuality.pm25UgM3 }));
  if (data.every((d) => d.pm25 === null)) return null;
  let lastIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i]!.pm25 !== null) {
      lastIdx = i;
      break;
    }
  }
  return (
    <div className={cn('h-[44px] w-[236px] shrink-0', className)} aria-hidden>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="heroSparkStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--pv-primary-strong)" />
              <stop offset="100%" stopColor="var(--pv-accent)" />
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="pm25"
            stroke="url(#heroSparkStroke)"
            strokeWidth={2.5}
            connectNulls={false}
            isAnimationActive={false}
            dot={(props: {
              index?: number;
              cx?: number;
              cy?: number;
              value?: number | null;
            }) =>
              props.index === lastIdx &&
              props.cx !== undefined &&
              props.cy !== undefined &&
              props.value !== null ? (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={6}
                  fill="var(--pv-accent)"
                  style={{ filter: 'drop-shadow(0 0 6px var(--pv-accent))' }}
                />
              ) : (
                <circle r={0} fill="transparent" />
              )
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
