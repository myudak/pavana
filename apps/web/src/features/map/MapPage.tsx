import { bearingToCompass16, windFromToFlowBearing } from '@pavana/shared';
import { CloudFog, Flame, Navigation, Wind, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { QueryState } from '@/components/QueryState';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import { useDarkMode } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { HotspotMap } from './HotspotMap';
import { DARK_STYLE_URL, useHotspots } from './use-hotspots';

export default function MapPage() {
  const t = useCopy();
  const { location, query: hotspots } = useHotspots();
  const [showHotspots, setShowHotspots] = useState(true);
  const [showDensity, setShowDensity] = useState(true);
  const [showWind, setShowWind] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const conditions = useConditions();
  const dark = useDarkMode();

  const tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  const wind = conditions.data?.weather;

  // Clear the selected detection when the location (and its hotspots) changes.
  useEffect(() => {
    setSelected(null);
  }, [location.lat, location.lon]);

  return (
    <div className="space-y-4">
      <h1 className="pt-2 font-heading text-3xl font-semibold tracking-tight">{t.map.title}</h1>
      {hotspots.data?.state === 'demo' && <DemoBanner />}

      <div role="group" aria-label="Layer" className="flex flex-wrap gap-2">
        <button
          aria-pressed={showDensity}
          onClick={() => setShowDensity((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm',
            showDensity
              ? 'border-accent/60 bg-accent/15 font-medium text-accent dark:[box-shadow:var(--pv-glow-accent)]'
              : 'border-border text-ink-muted',
          )}
        >
          <CloudFog className="size-4" aria-hidden />
          {t.map.layerDensity}
        </button>
        <button
          aria-pressed={showHotspots}
          onClick={() => setShowHotspots((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm',
            showHotspots
              ? 'border-accent/60 bg-accent/15 font-medium text-accent dark:[box-shadow:var(--pv-glow-accent)]'
              : 'border-border text-ink-muted',
          )}
        >
          <Flame className="size-4" aria-hidden />
          {t.map.layerHotspots}
        </button>
        <button
          aria-pressed={showWind}
          onClick={() => setShowWind((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm',
            showWind
              ? 'border-accent/60 bg-accent/15 font-medium text-accent dark:[box-shadow:var(--pv-glow-accent)]'
              : 'border-border text-ink-muted',
          )}
        >
          <Wind className="size-4" aria-hidden />
          {t.map.layerWind}
        </button>
      </div>

      <QueryState query={hotspots}>
        {(h) => (
          <>
          <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-5">
            <div className="lg:col-span-2">
              {!mapFailed ? (
                <div className="relative h-[62vh] min-h-80 overflow-hidden rounded-[1.5rem] border border-border bg-canvas shadow-xl dark:border-white/10 dark:[box-shadow:var(--pv-shadow-lift)]">
                  <HotspotMap
                    center={location}
                    hotspots={h.hotspots}
                    showHotspots={showHotspots}
                    showDensity={showDensity}
                    showWind={showWind}
                    timeZone={tz}
                    onError={() => setMapFailed(true)}
                    styleUrl={dark ? DARK_STYLE_URL : undefined}
                    onSelectHotspot={(props) => setSelected(props)}
                    wind={
                      wind?.windDirectionFromDeg != null && wind.windSpeedMs != null
                        ? {
                            fromDeg: wind.windDirectionFromDeg,
                            speedMs: wind.windSpeedMs,
                          }
                        : null
                    }
                  />
                  {wind?.windDirectionFromDeg != null && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs shadow dark:border-white/10 dark:bg-[var(--pv-glass)] dark:backdrop-blur">
                      <Navigation
                        className="size-4 text-primary-strong dark:text-accent"
                        style={{
                          transform: `rotate(${windFromToFlowBearing(wind.windDirectionFromDeg) - 45}deg)`,
                        }}
                        aria-hidden
                      />
                      <span>
                        {t.map.windNow}: {t.map.windFrom}{' '}
                        {bearingToCompass16(wind.windDirectionFromDeg)},{' '}
                        {formatNumber(wind.windSpeedMs, 1)} m/s
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <Card role="status" className="text-sm text-ink-muted">
                  {t.map.mapError}
                </Card>
              )}
            </div>

            <Card
              className={cn(
                'relative z-10 mx-1 space-y-3 text-sm dark:border-white/10 dark:bg-[var(--pv-glass)] dark:backdrop-blur',
                !mapFailed && '-mt-14 lg:mx-0 lg:mt-0',
              )}
            >
              <p className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full border-2 border-white bg-aq-unhealthy shadow"
                  aria-hidden
                />
                {t.map.legendHotspot} — {t.map.count(h.hotspots.length)}
              </p>
              <p className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full border-2 border-white bg-primary shadow"
                  aria-hidden
                />
                {t.map.legendLocation}: {location.label}
              </p>
              {showDensity && (
                <div className="space-y-1">
                  <p className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2.5 w-16 shrink-0 rounded-full"
                      style={{
                        background:
                          'linear-gradient(90deg, #3b82f6, #6366f1, #a855f7, #f472b6)',
                      }}
                    />
                    {t.map.legendDensity}
                  </p>
                </div>
              )}
              {wind?.windDirectionFromDeg != null && wind.windSpeedMs != null && (
                <p className="flex items-center gap-2">
                  <Navigation
                    className="size-4 shrink-0 text-primary-strong dark:text-accent"
                    style={{
                      transform: `rotate(${windFromToFlowBearing(wind.windDirectionFromDeg) - 45}deg)`,
                    }}
                    aria-hidden
                  />
                  <span>
                    {t.map.windNow}: {t.map.windFrom}{' '}
                    {bearingToCompass16(wind.windDirectionFromDeg)},{' '}
                    {formatNumber(wind.windSpeedMs, 1)} m/s
                  </span>
                </p>
              )}
              {selected && (
                <div className="space-y-1 rounded-2xl border border-accent/40 bg-accent/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold tabular-nums">
                      {typeof selected['lat'] === 'number' &&
                      typeof selected['lon'] === 'number'
                        ? `${(selected['lat'] as number).toFixed(3)}, ${(selected['lon'] as number).toFixed(3)}`
                        : String(selected['id'] ?? '')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded-full p-1 text-ink-muted hover:bg-surface-muted"
                      aria-label={t.map.closeDetail}
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{t.map.acquired}</dt>
                      <dd>{formatDateTime(String(selected['acquiredAt']), tz)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{t.map.frp}</dt>
                      <dd>
                        {selected['frpMw'] == null || selected['frpMw'] === 'null'
                          ? '—'
                          : `${selected['frpMw']} MW`}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{t.map.confidence}</dt>
                      <dd>{String(selected['confidence'] ?? '—')}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{t.map.satellite}</dt>
                      <dd>{String(selected['satellite'] ?? '—')}</dd>
                    </div>
                  </dl>
                </div>
              )}
              <p className="text-xs text-ink-muted">{t.map.hotspotDisclaimer}</p>
            </Card>
          </div>

            {mapFailed && (
              <Card>
                <ul className="divide-y divide-border text-sm">
                  {h.hotspots.map((s) => (
                    <li key={s.id} className="py-2">
                      {s.lat.toFixed(3)}, {s.lon.toFixed(3)} · {formatDateTime(s.acquiredAt, tz)} ·{' '}
                      {s.satellite}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </QueryState>
    </div>
  );
}
