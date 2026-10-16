import { CloudAngledRainIcon, FireIcon } from '@hugeicons/core-free-icons';
import type { ConditionsResponse, ExposureHour } from '@pavana/shared';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { msToKmh, windSummary } from '@/lib/wind';
import { Gauge } from './Gauge';

function Tile({
  title,
  value,
  note,
  visual,
  className,
}: {
  title: string;
  value: ReactNode;
  note?: ReactNode;
  visual?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('glass flex min-h-40 flex-col justify-between rounded-3xl p-4', className)}>
      <div>
        <p className="text-[13px] text-muted-foreground">{title}</p>
        <div className="mt-0.5 font-heading text-2xl font-semibold leading-tight">{value}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0 text-[11px] leading-snug text-muted-foreground">{note}</div>
        {visual}
      </div>
    </div>
  );
}

/** Compass dial: letters U/T/S/B, arrow showing where the wind BLOWS, speed in the middle. */
export function WindDial({ toDeg, speedKmh }: { toDeg: number | null; speedKmh: number | null }) {
  const t = useCopy();
  const ticks = Array.from({ length: 48 }, (_, i) => i * 7.5);
  return (
    <div className="relative size-28 shrink-0 sm:size-32">
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
        {ticks.map((a) => {
          const rad = ((a - 90) * Math.PI) / 180;
          const long = a % 90 === 0;
          const r1 = long ? 38 : 41;
          return (
            <line
              key={a}
              x1={50 + r1 * Math.cos(rad)}
              y1={50 + r1 * Math.sin(rad)}
              x2={50 + 45 * Math.cos(rad)}
              y2={50 + 45 * Math.sin(rad)}
              stroke="var(--pv-ink-muted)"
              strokeOpacity={long ? 0.9 : 0.35}
              strokeWidth={long ? 1.6 : 1}
            />
          );
        })}
        {toDeg !== null && (
          <g style={{ transform: `rotate(${toDeg}deg)`, transformOrigin: '50px 50px' }}>
            <line
              x1={50}
              y1={84}
              x2={50}
              y2={20}
              stroke="var(--pv-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <path d="M50 10 57 24 50 20 43 24z" fill="var(--pv-accent)" />
            <circle cx={50} cy={86} r={3.5} fill="none" stroke="var(--pv-accent)" strokeWidth={2} />
          </g>
        )}
        <circle cx={50} cy={50} r={16} fill="var(--pv-primary)" />
      </svg>
      {(['n', 'e', 's', 'w'] as const).map((k, i) => (
        <span
          key={k}
          className={cn(
            'absolute text-[9px] font-semibold text-muted-foreground',
            i === 0 && 'left-1/2 top-[13%] -translate-x-1/2',
            i === 1 && 'right-[13%] top-1/2 -translate-y-1/2',
            i === 2 && 'bottom-[13%] left-1/2 -translate-x-1/2',
            i === 3 && 'left-[13%] top-1/2 -translate-y-1/2',
          )}
        >
          {t.compassShort[k]}
        </span>
      ))}
      <span className="absolute inset-0 flex flex-col items-center justify-center text-[10px] font-semibold leading-none text-primary-foreground">
        <span className="tabular text-xs">{speedKmh === null ? '—' : formatNumber(speedKmh)}</span>
        km/j
      </span>
    </div>
  );
}

/** Weather-app style tiles for the current hour. Missing values say so; never zero. */
export function ConditionTiles({
  conditions: c,
  now,
}: {
  conditions: ConditionsResponse;
  now: ExposureHour | undefined;
}) {
  const t = useCopy();
  const w = c.weather;
  const wind = w?.windDirectionFromDeg == null ? null : windSummary(w.windDirectionFromDeg, t);
  const speed = w?.windSpeedMs == null ? null : msToKmh(w.windSpeedMs);
  const aqi = c.airQuality.aqi?.value ?? null;
  const up = now?.upwind ?? null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div className="glass col-span-2 flex items-center justify-between gap-4 rounded-3xl p-4">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{t.tiles.wind}</p>
          <p className="mt-0.5 font-heading text-2xl font-semibold leading-tight">
            {wind ? t.tiles.windFrom(wind.fromName) : t.tiles.missing}
          </p>
          {wind && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t.tiles.windTo(wind.toName.toLowerCase())}
            </p>
          )}
          {speed !== null && (
            <p className="mt-3 font-heading text-lg font-semibold">
              <span className="tabular">{formatNumber(speed)}</span>{' '}
              <span className="text-sm font-normal text-muted-foreground">km/j</span>
            </p>
          )}
        </div>
        <WindDial toDeg={wind?.toDeg ?? null} speedKmh={speed} />
      </div>
      <Tile
        title={t.tiles.aqi}
        value={aqi === null ? t.tiles.missing : <span className="tabular">{aqi}</span>}
        note={t.tiles.aqiNote}
        visual={
          <Gauge
            value={aqi}
            min={0}
            max={300}
            stops={[
              'var(--pv-aq-good)',
              'var(--pv-aq-moderate)',
              'var(--pv-aq-usg)',
              'var(--pv-aq-unhealthy)',
              'var(--pv-aq-very-unhealthy)',
            ]}
            size={72}
          />
        }
      />
      <Tile
        title={t.tiles.humidity}
        value={
          w?.relativeHumidityPct == null ? (
            t.tiles.missing
          ) : (
            <span className="tabular">{formatNumber(w.relativeHumidityPct)}%</span>
          )
        }
        visual={
          <Gauge
            value={w?.relativeHumidityPct ?? null}
            min={0}
            max={100}
            stops={['#93c5fd', '#3b82f6']}
            size={72}
          >
            <svg viewBox="0 0 24 24" className="size-5 text-blue-400" aria-hidden>
              <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z" fill="currentColor" />
            </svg>
          </Gauge>
        }
      />
      <Tile
        title={t.tiles.temperature}
        note={
          <span className="inline-flex items-center gap-1">
            <Icon icon={CloudAngledRainIcon} className="size-3.5" />
            {t.tiles.rain}:{' '}
            {w?.precipitationMm == null
              ? '—'
              : w.precipitationMm === 0
                ? t.tiles.rainNone.toLowerCase()
                : `${formatNumber(w.precipitationMm, 1)} mm`}
          </span>
        }
        value={
          w?.temperatureC == null ? (
            t.tiles.missing
          ) : (
            <span className="tabular">{formatNumber(w.temperatureC)}°</span>
          )
        }
        visual={
          <Gauge
            value={w?.temperatureC ?? null}
            min={15}
            max={40}
            stops={['#60a5fa', '#34d399', '#fbbf24', '#f97316']}
            size={72}
          />
        }
      />
      <Tile
        title={t.tiles.hotspots}
        value={
          up === null ? (
            t.tiles.missing
          ) : (
            <span className="tabular">
              {up.contributingCount}
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                / {up.consideredCount}
              </span>
            </span>
          )
        }
        note={t.tiles.hotspotsNote}
        visual={
          <span className="flex size-12 items-center justify-center rounded-2xl bg-exp-high/15">
            <Icon icon={FireIcon} className="size-6 text-exp-high" />
          </span>
        }
      />
    </div>
  );
}
