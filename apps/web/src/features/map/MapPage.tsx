import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  CloudFastWindIcon,
  FastWindIcon,
  FireIcon,
  Gps01Icon,
  Layers01Icon,
  MapsGlobal01Icon,
  MinusSignIcon,
  PlusSignIcon,
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
import type maplibregl from 'maplibre-gl';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
import { cn } from '@/lib/utils';
import { msToKmh, windSummary } from '@/lib/wind';
import { HotspotMap, type MapInsets } from './HotspotMap';
import { MapLegend } from './MapLegend';
import { densityImageCoords, renderDensityCanvas } from './density-canvas';
import { useHotspots, useRegionalHotspots, useWindField } from './use-hotspots';

type Layer = 'hotspots' | 'plumes' | 'density' | 'wind';
/** Strongest detections get a trail; more would only add noise at regional zoom. */
const PLUME_SOURCES = 160;

/** 'Sekitarku' half-span in degrees (~90 km across): zoom ≈ 8 on a phone. */
const LOCAL_HALF_SPAN_DEG = 0.4;
/** Large screens would fit the same box much closer; keep nearby detections in view. */
const LOCAL_MAX_ZOOM = 8.75;

const CHIP =
  'glass h-9 shrink-0 gap-1.5 rounded-full border-0 px-3.5 text-[13px] font-medium text-foreground/80 data-[state=on]:bg-haze/20 data-[state=on]:text-haze data-[state=on]:shadow-[0_0_18px_-4px_var(--pv-accent)]';

export default function MapPage() {
  const t = useCopy();
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
  const [sheetOpen, setSheetOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches,
  );
  const mapRef = useRef<maplibregl.Map | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState<MapInsets>({ top: 0, right: 56, bottom: 0, left: 0 });

  const on = (l: Layer) => layers.includes(l);
  const localBox = useMemo(
    () =>
      [
        location.lon - LOCAL_HALF_SPAN_DEG,
        location.lat - LOCAL_HALF_SPAN_DEG,
        location.lon + LOCAL_HALF_SPAN_DEG,
        location.lat + LOCAL_HALF_SPAN_DEG,
      ] as BBox,
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

  // Floating chrome covers parts of the map: measure it so fits, the legend and
  // the attribution stay in the visible area.
  useLayoutEffect(() => {
    const top = topRef.current;
    const sheet = sheetRef.current;
    if (!top || !sheet) return;
    const measure = () => {
      const next = {
        top: Math.round(top.getBoundingClientRect().bottom - 16),
        right: 56,
        bottom: Math.max(0, Math.round(window.innerHeight - sheet.getBoundingClientRect().top)),
        left: 0,
      };
      setInsets((prev) => (prev.top === next.top && prev.bottom === next.bottom ? prev : next));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(measure);
    obs.observe(top);
    obs.observe(sheet);
    window.addEventListener('resize', measure);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [mapFailed]);

  // Keep the selected detection visible above the (taller) detail card.
  useEffect(() => {
    const map = mapRef.current;
    const lat = selected?.['lat'];
    const lon = selected?.['lon'];
    if (!map || typeof lat !== 'number' || typeof lon !== 'number') return;
    const y = map.project([lon, lat]).y;
    const h = map.getContainer().clientHeight;
    if (y > insets.top && y < h - insets.bottom - 24) return;
    map.easeTo({
      center: [lon, lat],
      offset: [0, (insets.top - insets.bottom) / 2],
      duration: 400,
    });
  }, [selected, insets]);

  const goTo = (v: 'local' | 'region') => {
    setView(v);
    setFitNonce((n) => n + 1);
  };
  const windNow =
    wind?.windDirectionFromDeg != null && wind.windSpeedMs != null
      ? { ...windSummary(wind.windDirectionFromDeg, t), kmh: msToKmh(wind.windSpeedMs) }
      : null;

  const ageH = typeof selected?.['ageH'] === 'number' ? selected['ageH'] : null;
  const frp = selected?.['frpMw'];
  const conf = selected?.['confidence'];

  return (
    <div
      className="relative h-dvh w-full overflow-hidden bg-background"
      style={{ '--pv-map-inset-bottom': `${insets.bottom}px` } as CSSProperties}
    >
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
          fitMaxZoom={view === 'local' ? LOCAL_MAX_ZOOM : 11}
          insets={insets}
          onMapReady={(m) => (mapRef.current = m)}
          onError={() => setMapFailed(true)}
          onSelectHotspot={(p) => setSelected(p)}
          selectedId={typeof selected?.['id'] === 'string' ? selected['id'] : null}
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
      <div
        ref={topRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 bg-gradient-to-b from-background/80 to-transparent px-3 pb-4 pt-[max(env(safe-area-inset-top),0.75rem)]"
      >
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

      {on('hotspots') && !mapFailed && (
        <div className="absolute left-3 z-10" style={{ top: insets.top + 8 }}>
          <MapLegend />
        </div>
      )}

      {/* Right-side map controls: zoom, then the two views (Sekitarku re-centers). */}
      {!mapFailed && (
        <div className="absolute right-3 z-10 flex flex-col gap-2" style={{ top: insets.top + 8 }}>
          <div className="glass flex flex-col overflow-hidden rounded-full">
            <MapButton label={t.map.zoomIn} onClick={() => mapRef.current?.zoomIn()}>
              <Icon icon={PlusSignIcon} className="size-5" />
            </MapButton>
            <span aria-hidden className="mx-2.5 h-px bg-border" />
            <MapButton label={t.map.zoomOut} onClick={() => mapRef.current?.zoomOut()}>
              <Icon icon={MinusSignIcon} className="size-5" />
            </MapButton>
          </div>
          <div
            role="group"
            aria-label={t.map.viewsLabel}
            className="glass flex flex-col overflow-hidden rounded-full"
          >
            <MapButton
              label={t.map.viewLocal}
              pressed={view === 'local'}
              onClick={() => goTo('local')}
            >
              <Icon icon={Gps01Icon} className="size-5" />
            </MapButton>
            <span aria-hidden className="mx-2.5 h-px bg-border" />
            <MapButton
              label={t.map.viewRegion}
              pressed={view === 'region'}
              onClick={() => goTo('region')}
            >
              <Icon icon={MapsGlobal01Icon} className="size-5" />
            </MapButton>
          </div>
        </div>
      )}

      {/* Bottom sheet: hotspot detail, or the collapsible smoke-direction panel */}
      <div
        ref={sheetRef}
        className="absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-lg lg:bottom-6"
      >
        {selected ? (
          <div className="glass rounded-3xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t.map.detailTitle}
                </p>
                <p className="mt-1 font-heading text-lg font-semibold tabular">
                  {typeof selected['lat'] === 'number' && typeof selected['lon'] === 'number'
                    ? `${selected['lat'].toFixed(3)}, ${selected['lon'].toFixed(3)}`
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
                <dt className="text-xs text-muted-foreground">{t.map.age}</dt>
                <dd className="flex items-center gap-1.5">
                  {ageH != null && (
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ background: `var(--pv-fire-age-${String(selected['ageClass'])})` }}
                    />
                  )}
                  <span title={t.map.ageNote}>{ageH == null ? '—' : t.map.ageValue(ageH)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.map.frp}</dt>
                <dd className="tabular">
                  {frp == null || frp === 'null' ? '—' : `${String(frp)} MW`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.map.confidence}</dt>
                <dd>
                  {conf == null || conf === 'null'
                    ? '—'
                    : (t.map.confidenceLevels[String(conf)] ?? String(conf))}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">{t.map.satellite}</dt>
                <dd>{String(selected['satellite'] ?? '—')}</dd>
              </div>
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {t.map.hotspotDisclaimer} {t.map.ageNote}
              {selected['isDemo'] === true && ` (${t.demoBanner})`}
            </p>
          </div>
        ) : (
          <div className="glass rounded-3xl">
            <button
              type="button"
              onClick={() => setSheetOpen((o) => !o)}
              aria-expanded={sheetOpen}
              aria-label={sheetOpen ? t.map.hideSheet : t.map.showSheet}
              className="flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium">{t.map.plumesTitle}</span>
                  <span className="tabular text-sm font-semibold text-haze">
                    {t.map.plumesHours(plumeHours)}
                  </span>
                </span>
                {!sheetOpen && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                    <span className="tabular">{t.map.count(shown.length)}</span>
                    {windNow && (
                      <span className="inline-flex items-center gap-1">
                        <WindArrow toDeg={windNow.toDeg} className="size-3 text-haze" />
                        {t.tiles.windFrom(windNow.fromName)}, {formatNumber(windNow.kmh)} km/j
                      </span>
                    )}
                  </span>
                )}
              </span>
              <Icon
                icon={sheetOpen ? ArrowDown01Icon : ArrowUp01Icon}
                className="size-4 shrink-0 text-muted-foreground"
              />
            </button>
            {sheetOpen && (
              <div className="px-4 pb-4">
                <Slider
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
                    background:
                      'linear-gradient(90deg, var(--pv-map-plume-a), var(--pv-map-plume-b), transparent)',
                  }}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{t.map.plumesFrom}</span>
                  <span>{t.map.plumesHours(plumeHours)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full ring-2 ring-[var(--pv-fire-stroke)]"
                      style={{ background: 'var(--pv-fire-age-0)' }}
                    />
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
        )}
      </div>
    </div>
  );
}

function MapButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        'flex size-11 items-center justify-center text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
        pressed && 'text-haze',
      )}
    >
      {children}
    </button>
  );
}
