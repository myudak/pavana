import {
  Cancel01Icon,
  FastWindIcon,
  FireIcon,
  Gps01Icon,
  Layers01Icon,
  MapsGlobal01Icon,
  CloudFastWindIcon,
} from '@hugeicons/core-free-icons';
import {
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
  tracePlumes,
  traceStreamlines,
  type BBox,
  type Hotspot,
} from '@pavana/shared';
import { useEffect, useMemo, useState } from 'react';
import { DesktopNav } from '@/app/layout/DesktopNav';
import { DemoPill } from '@/components/DemoBanner';
import { Icon } from '@/components/Icon';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WindArrow } from '@/components/WindArrow';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LocationPicker } from '@/features/location/LocationPicker';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import { useDarkMode } from '@/lib/theme-context';
import { cn } from '@/lib/utils';
import { msToKmh, windSummary } from '@/lib/wind';
import { HotspotMap } from './HotspotMap';
import { densityImageCoords, renderDensityCanvas } from './density-canvas';
import { DARK_STYLE_URL, useHotspots, useRegionalHotspots, useWindField } from './use-hotspots';

type Layer = 'hotspots' | 'plumes' | 'density' | 'wind';
/** Strongest detections get a trail; more would only add noise at regional zoom. */
const PLUME_SOURCES = 160;

const CHIP =
  'glass h-9 shrink-0 gap-1.5 rounded-full border-0 px-3.5 text-[13px] font-medium text-foreground/80 data-[state=on]:bg-haze/20 data-[state=on]:text-haze data-[state=on]:shadow-[0_0_18px_-4px_var(--pv-accent)]';

export default function MapPage() {
  const t = useCopy();
  const dark = useDarkMode();
  const { location, query: hotspots } = useHotspots();
  const regional = useRegionalHotspots();
  const windField = useWindField();
  const conditions = useConditions();
  const [layers, setLayers] = useState<Layer[]>(['hotspots', 'plumes', 'wind']);
  const [view, setView] = useState<'local' | 'region'>('local');
  const [fitNonce, setFitNonce] = useState(0);
  const [plumeHours, setPlumeHours] = useState(6);
  const [mapFailed, setMapFailed] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const on = (l: Layer) => layers.includes(l);
  // 'Sekitarku' view: roughly 250 km around the selected location.
  const localBox = useMemo(
    () => [location.lon - 1.1, location.lat - 1.1, location.lon + 1.1, location.lat + 1.1] as BBox,
    [location.lon, location.lat],
  );
  const tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  const wind = conditions.data?.weather;
  const isDemo = hotspots.data?.state === 'demo';

  // Local detections + the island-wide field, deduped by id.
  const shown: Hotspot[] = useMemo(() => {
    const local = hotspots.data?.hotspots ?? [];
    const region = regional.query.data?.hotspots ?? [];
    const ids = new Set(region.map((r) => r.id));
    return [...region, ...local.filter((p) => !ids.has(p.id))];
  }, [hotspots.data, regional.query.data]);

  const density = useMemo(() => {
    if (shown.length === 0) return null;
    const field = buildDensityField(
      shown.map((h) => ({ lat: h.lat, lon: h.lon, weight: hotspotWeight(h.frpMw) })),
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
    );
    const values = normalizeField(field.values, {
      percentile: DENSITY_PERCENTILE,
      gamma: DENSITY_GAMMA,
    });
    return {
      canvas: renderDensityCanvas({ ...field, values }),
      coords: densityImageCoords(BORNEO_RENDER_BBOX),
    };
  }, [shown]);

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

  // Indicative smoke-direction trails from the strongest detections.
  const plumes = useMemo(() => {
    const field = windField.query.data;
    if (!field || shown.length === 0 || plumeHours === 0) return null;
    const sources = shown
      .map((h) => ({ lat: h.lat, lon: h.lon, weight: hotspotWeight(h.frpMw) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, PLUME_SOURCES);
    const maxW = sources[0]?.weight ?? 1;
    return tracePlumes(
      sources.map((s) => ({ ...s, weight: 0.35 + 0.65 * (s.weight / maxW) })),
      field,
      { hours: plumeHours, stepMinutes: 30 },
    );
  }, [windField.query.data, shown, plumeHours]);

  useEffect(() => setSelected(null), [location.lat, location.lon]);

  const goTo = (v: 'local' | 'region') => {
    setView(v);
    setFitNonce((n) => n + 1);
  };
  const windNow =
    wind?.windDirectionFromDeg != null && wind.windSpeedMs != null
      ? { ...windSummary(wind.windDirectionFromDeg, t), kmh: msToKmh(wind.windSpeedMs) }
      : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-background">
      {!mapFailed ? (
        <HotspotMap
          center={location}
          hotspots={shown}
          showHotspots={on('hotspots')}
          showDensity={on('density')}
          showWind={on('wind')}
          density={on('density') ? density : null}
          fitTo={view === 'region' ? BORNEO_RENDER_BBOX : localBox}
          streamlines={streamlines}
          plumes={plumes}
          showPlumes={on('plumes')}
          fitNonce={fitNonce}
          timeZone={tz}
          controls={false}
          onError={() => setMapFailed(true)}
          styleUrl={dark ? DARK_STYLE_URL : undefined}
          onSelectHotspot={(p) => setSelected(p)}
          wind={
            wind?.windDirectionFromDeg != null && wind.windSpeedMs != null
              ? { fromDeg: wind.windDirectionFromDeg, speedMs: wind.windSpeedMs }
              : null
          }
        />
      ) : (
        <div
          role="status"
          className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground"
        >
          {t.map.mapError}
        </div>
      )}

      {/* Top chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 bg-gradient-to-b from-background/80 to-transparent px-3 pb-6 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="glass flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full pl-4 pr-2">
            <LocationPicker className="min-w-0 flex-1" />
            {isDemo && <DemoPill />}
          </div>
          <DesktopNav className="shrink-0" />
          <ThemeToggle className="size-11" />
        </div>
        <ToggleGroup
          type="multiple"
          value={layers}
          onValueChange={(v) => setLayers(v as Layer[])}
          aria-label={t.map.layersLabel}
          className="pointer-events-auto -mx-3 w-[calc(100%+1.5rem)] justify-start gap-2 overflow-x-auto px-3 pb-1 scrollbar-none"
        >
          <ToggleGroupItem value="hotspots" className={CHIP}>
            <Icon icon={FireIcon} className="size-4" /> {t.map.layerHotspots}
          </ToggleGroupItem>
          <ToggleGroupItem value="plumes" className={CHIP}>
            <Icon icon={CloudFastWindIcon} className="size-4" /> {t.map.layerPlumes}
          </ToggleGroupItem>
          <ToggleGroupItem value="wind" className={CHIP}>
            <Icon icon={FastWindIcon} className="size-4" /> {t.map.layerWind}
          </ToggleGroupItem>
          <ToggleGroupItem value="density" className={CHIP}>
            <Icon icon={Layers01Icon} className="size-4" /> {t.map.layerDensity}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Right-side view controls */}
      <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo('local')}
          aria-label={t.map.viewLocal}
          title={t.map.viewLocal}
          className={cn('glass size-11 rounded-full', view === 'local' && 'text-haze')}
        >
          <Icon icon={Gps01Icon} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => goTo('region')}
          aria-label={t.map.viewRegion}
          title={t.map.viewRegion}
          className={cn('glass size-11 rounded-full', view === 'region' && 'text-haze')}
        >
          <Icon icon={MapsGlobal01Icon} />
        </Button>
      </div>

      {/* Bottom sheet */}
      <div className="absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-lg lg:bottom-6">
        {selected ? (
          <div className="glass rounded-3xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t.map.detailTitle}
                </p>
                <p className="mt-1 font-heading text-lg font-semibold tabular">
                  {typeof selected['lat'] === 'number' && typeof selected['lon'] === 'number'
                    ? `${(selected['lat'] as number).toFixed(3)}, ${(selected['lon'] as number).toFixed(3)}`
                    : String(selected['id'] ?? '')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelected(null)}
                aria-label={t.map.closeDetail}
                className="rounded-full"
              >
                <Icon icon={Cancel01Icon} className="size-4" />
              </Button>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t.map.acquired}</dt>
                <dd>{formatDateTime(String(selected['acquiredAt']), tz)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.map.frp}</dt>
                <dd>
                  {selected['frpMw'] == null || selected['frpMw'] === 'null'
                    ? '—'
                    : `${String(selected['frpMw'])} MW`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.map.confidence}</dt>
                <dd>{String(selected['confidence'] ?? '—')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.map.satellite}</dt>
                <dd>{String(selected['satellite'] ?? '—')}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">{t.map.hotspotDisclaimer}</p>
          </div>
        ) : (
          <div className="glass rounded-3xl p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{t.map.plumesTitle}</p>
              <p className="tabular text-sm font-semibold text-haze">
                {t.map.plumesHours(plumeHours)}
              </p>
            </div>
            <Slider
              className="mt-3"
              value={[plumeHours]}
              min={0}
              max={12}
              step={1}
              onValueChange={([v]) => {
                setPlumeHours(v ?? 0);
                if (!on('plumes')) setLayers((l) => [...l, 'plumes']);
              }}
              aria-label={t.map.plumesTitle}
            />
            <div
              aria-hidden
              className="mt-3 h-2 rounded-full"
              style={{
                background: 'linear-gradient(90deg, #f472b6, #a855f7, rgba(99,102,241,0.15))',
              }}
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{t.map.plumesFrom}</span>
              <span>{t.map.plumesHours(plumeHours)}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-aq-unhealthy ring-2 ring-white/80" />
                {t.map.count(shown.length)}
              </span>
              {windNow && (
                <span className="inline-flex items-center gap-1.5">
                  <WindArrow toDeg={windNow.toDeg} className="size-3.5 text-haze" />
                  {t.tiles.windFrom(windNow.fromName)}, {formatNumber(windNow.kmh)} km/j
                </span>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {t.map.plumesNote}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {isDemo ? t.map.creditDemo : t.map.creditLive}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
