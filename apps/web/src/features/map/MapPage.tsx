import {
  bearingToCompass16,
  BORNEO_RENDER_BBOX,
  buildDensityField,
  DENSITY_COLS,
  DENSITY_FINE_WEIGHT,
  DENSITY_GAMMA,
  DENSITY_MID_WEIGHT,
  DENSITY_PERCENTILE,
  DENSITY_SIGMA_FINE_KM,
  DENSITY_SIGMA_MID_KM,
  DENSITY_SIGMA_WIDE_KM,
  DENSITY_WIDE_WEIGHT,
  hotspotWeight,
  normalizeField,
  STREAMLINE_MAX_LENGTH_KM,
  STREAMLINE_MIN_LENGTH_KM,
  STREAMLINE_MIN_SPACING_KM,
  STREAMLINE_MIN_SPEED_MS,
  STREAMLINE_SEED,
  STREAMLINE_STEP_KM,
  STREAMLINE_TARGET_COUNT,
  traceStreamlines,
  windFromToFlowBearing,
} from '@pavana/shared';
import { CloudFog, Flame, Maximize2, Navigation, Wind, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { QueryState } from '@/components/QueryState';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import { useDarkMode } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { HotspotMap } from './HotspotMap';
import { densityImageCoords, renderDensityCanvas } from './density-canvas';
import { DARK_STYLE_URL, useHotspots, useRegionalHotspots, useWindField } from './use-hotspots';

export default function MapPage() {
  const t = useCopy();
  const { location, query: hotspots } = useHotspots();
  const regional = useRegionalHotspots();
  const windField = useWindField();
  const [showHotspots, setShowHotspots] = useState(true);
  const [showDensity, setShowDensity] = useState(true);
  const [showWind, setShowWind] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  const [fitNonce, setFitNonce] = useState(0);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const conditions = useConditions();
  const dark = useDarkMode();

  const tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  const wind = conditions.data?.weather;

  // Regional density field (island-wide). Local points are merged in so the
  // density view stays a superset; the regional fixture keeps a keep-out zone
  // around the scenario location, so nothing is double-counted.
  const regionalPts = useMemo(
    () => regional.query.data?.hotspots ?? [],
    [regional.query.data],
  );
  const densityField = useMemo(
    () =>
      regionalPts.length === 0
        ? null
        : buildDensityField(
            regionalPts.map((h) => ({ lat: h.lat, lon: h.lon, weight: hotspotWeight(h.frpMw) })),
            BORNEO_RENDER_BBOX,
            {
              cols: DENSITY_COLS,
              sigmaWideKm: DENSITY_SIGMA_WIDE_KM,
              sigmaMidKm: DENSITY_SIGMA_MID_KM,
              sigmaFineKm: DENSITY_SIGMA_FINE_KM,
              wideWeight: DENSITY_WIDE_WEIGHT,
              midWeight: DENSITY_MID_WEIGHT,
              fineWeight: DENSITY_FINE_WEIGHT,
            },
          ),
    [regionalPts],
  );
  const densityCanvas = useMemo(() => {
    if (!densityField) return null;
    const values = normalizeField(densityField.values, {
      percentile: DENSITY_PERCENTILE,
      gamma: DENSITY_GAMMA,
    });
    return renderDensityCanvas({ ...densityField, values });
  }, [densityField]);

  // Regional wind streamlines (flow direction, RK2). Memoized on field data.
  const streamlines = useMemo(() => {
    const field = windField.query.data;
    if (!field) return null;
    return traceStreamlines(field, BORNEO_RENDER_BBOX, {
      targetCount: STREAMLINE_TARGET_COUNT,
      minSpacingKm: STREAMLINE_MIN_SPACING_KM,
      stepKm: STREAMLINE_STEP_KM,
      minLengthKm: STREAMLINE_MIN_LENGTH_KM,
      maxLengthKm: STREAMLINE_MAX_LENGTH_KM,
      minSpeedMs: STREAMLINE_MIN_SPEED_MS,
      seed: STREAMLINE_SEED,
    });
  }, [windField.query.data]);

  // Clear the selected detection when the location (and its hotspots) changes.
  useEffect(() => {
    setSelected(null);
  }, [location.lat, location.lon]);

  return (
    <div className="mx-auto w-full max-w-[1344px] space-y-4 px-4 pb-28 pt-2 md:px-6 lg:px-8 lg:pb-12">
      <h1 className="pt-2 font-heading text-3xl font-bold tracking-tight">{t.map.title}</h1>
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
        <button
          type="button"
          onClick={() => setFitNonce((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm text-ink-muted"
        >
          <Maximize2 className="size-4" aria-hidden />
          {t.map.fitKalimantan}
        </button>
      </div>

      <QueryState query={hotspots}>
        {(h) => {
          // Same detection can arrive from both queries (overlapping bboxes):
          // dedupe by id so counts and markers stay honest.
          const regionalIds = new Set(regionalPts.map((r) => r.id));
          const shown = showDensity
            ? [...regionalPts, ...h.hotspots.filter((p) => !regionalIds.has(p.id))]
            : h.hotspots;
          const density = showDensity && densityCanvas ? { canvas: densityCanvas, coords: densityImageCoords(BORNEO_RENDER_BBOX) } : null;
          return (
          <>
          <div className="grid items-start gap-4 lg:grid-cols-3 lg:gap-5">
            <div className="lg:col-span-2">
              {!mapFailed ? (
                <div className="relative h-[70vh] min-h-80 overflow-hidden rounded-[1.5rem] border border-border bg-canvas shadow-xl dark:border-white/10 dark:[box-shadow:var(--pv-shadow-lift)] lg:h-[min(78vh,760px)] lg:min-h-[560px]">
                  <HotspotMap
                    center={location}
                    hotspots={shown}
                    showHotspots={showHotspots}
                    showDensity={showDensity}
                    showWind={showWind}
                    density={density}
                    fitTo={showDensity ? BORNEO_RENDER_BBOX : null}
                    streamlines={streamlines}
                    fitNonce={fitNonce}
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
                  {/* Wind summary lives in the side panel (single source, no duplicate). */}
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
                {t.map.legendHotspot} — {t.map.count(showDensity ? shown.length : h.hotspots.length)}
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
                  <p className="pl-5 text-xs text-ink-muted">{t.map.noDetectionNote}</p>
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
              {showWind && windField.query.data && (
                <p className="text-xs text-ink-muted">{t.map.windFieldNote}</p>
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
          );
        }}
      </QueryState>
    </div>
  );
}
