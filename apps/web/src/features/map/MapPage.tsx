import {
  ArrowDown01Icon,
  Cancel01Icon,
  FastWindIcon,
  FireIcon,
  Gps01Icon,
  InformationCircleIcon,
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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
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
import { HotspotMap, INDONESIA_BBOX } from './HotspotMap';
import { densityImageCoords, renderDensityCanvas } from './density-canvas';
import { DARK_STYLE_URL, useHotspots, useRegionalHotspots, useWindField } from './use-hotspots';

type Layer = 'hotspots' | 'plumes' | 'density' | 'wind';
/** Strongest detections get a trail; more would only add noise at regional zoom. */
const PLUME_SOURCES = 160;
/** Cap for the map-failure fallback list (the full count stays in the header). */
const FALLBACK_LIMIT = 100;

/** Deep-link focus (?lat=&lon=&zoom=), validated; null means the default view. */
function parseFocus(sp: URLSearchParams): { center: { lat: number; lon: number }; zoom: number } | null {
  const lat = Number(sp.get('lat'));
  const lon = Number(sp.get('lon'));
  const zoom = Number(sp.get('zoom'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(zoom)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || zoom < 0 || zoom > 22) return null;
  return { center: { lat, lon }, zoom };
}

const CHIP =
  'glass h-9 shrink-0 gap-1.5 rounded-full border-0 px-3.5 text-[13px] font-medium text-foreground/80 data-[state=on]:bg-haze/20 data-[state=on]:text-haze data-[state=on]:shadow-[0_0_18px_-4px_var(--pv-accent)]';

/**
 * Fallback when the map itself cannot render: the same detections the map
 * would show, as a plain scrollable list. Never an empty white area — loading,
 * a clear empty state, or the list itself.
 */
function MapFallback({
  count,
  items,
  truncated,
  pending,
  timeZone,
}: {
  count: number;
  items: Hotspot[];
  truncated: boolean;
  pending: boolean;
  timeZone: string;
}) {
  const t = useCopy();
  return (
    <div role="status" className="h-full overflow-y-auto px-4 pb-8 pt-32 lg:pt-28">
      <div className="mx-auto w-full max-w-lg space-y-3">
        <p className="text-sm text-muted-foreground">{t.map.mapError}</p>
        {pending ? (
          <p className="text-sm text-muted-foreground">{t.common.loading}</p>
        ) : count === 0 ? (
          <p className="text-sm text-muted-foreground">{t.info.cards.hotspotNone}</p>
        ) : (
          <>
            <p className="font-heading text-lg font-semibold tabular">{t.map.count(count)}</p>
            <ul className="space-y-2">
              {items.map((h) => (
                <li
                  key={h.id}
                  className="glass flex items-center gap-3 rounded-2xl p-3 text-sm"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-accent"
                    style={{ boxShadow: '0 0 10px var(--pv-accent)' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium tabular">
                      {h.lat.toFixed(3)}, {h.lon.toFixed(3)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t.map.acquired}: {formatDateTime(h.acquiredAt, timeZone)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular text-muted-foreground">
                    {h.frpMw == null ? '—' : `${formatNumber(h.frpMw)} MW`}
                  </span>
                </li>
              ))}
            </ul>
            {truncated && (
              <p className="text-xs text-muted-foreground">
                {t.map.fallbackMore(formatNumber(count - items.length))}
              </p>
            )}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t.map.hotspotDisclaimer}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MapPage() {
  const t = useCopy();
  const dark = useDarkMode();
  const { location, query: hotspots } = useHotspots();
  const regional = useRegionalHotspots();
  const windField = useWindField();
  const conditions = useConditions();
  const [layers, setLayers] = useState<Layer[]>(['hotspots', 'plumes', 'wind', 'density']);
  const [view, setView] = useState<'indonesia' | 'local' | 'region'>('indonesia');
  const [fitNonce, setFitNonce] = useState(0);
  const [plumeHours, setPlumeHours] = useState(6);
  /** The smoke-direction card can fold away so it stops covering the map. */
  const [plumesOpen, setPlumesOpen] = useState(true);
  const [searchParams] = useSearchParams();
  // One-shot deep-link focus: honored once at creation, never refit afterwards.
  const [focus] = useState(() => parseFocus(searchParams));
  const [mapFailed, setMapFailed] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const on = (l: Layer) => layers.includes(l);
  // 'Sekitarku' view: roughly 250 km around the selected location.
  const localBox = useMemo(
    () => [location.lon - 1.1, location.lat - 1.1, location.lon + 1.1, location.lat + 1.1] as BBox,
    [location.lon, location.lat],
  );
  // Measured chrome for the default fit: top chrome height, sheet height (also
  // exposed as --map-sheet-h for the buttons column), and the sheet's distance
  // from the container bottom (card + bottom nav) for the fit padding.
  // Layout effect so heights are ready before the map's first fit.
  const containerRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [chromePad, setChromePad] = useState({ top: 0, sheetH: 0, sheetGap: 0 });
  useLayoutEffect(() => {
    const containerEl = containerRef.current;
    const topEl = topRef.current;
    const sheetEl = sheetRef.current;
    if (!containerEl || !topEl || !sheetEl) return;
    const measure = () => {
      const next = {
        top: topEl.offsetHeight,
        sheetH: sheetEl.offsetHeight,
        sheetGap: containerEl.offsetHeight - sheetEl.offsetTop,
      };
      setChromePad((prev) =>
        prev.top === next.top && prev.sheetH === next.sheetH && prev.sheetGap === next.sheetGap
          ? prev
          : next,
      );
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(containerEl);
    obs.observe(topEl);
    obs.observe(sheetEl);
    return () => obs.disconnect();
  }, []);
  const fitPadding = useMemo(
    () => ({ top: chromePad.top + 12, bottom: chromePad.sheetGap + 12, left: 16, right: 16 }),
    [chromePad],
  );
  // Attribution popover (3rd round button). Closes on outside tap, re-press, Esc.
  const [attribOpen, setAttribOpen] = useState(false);
  const attribRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!attribOpen) return;
    const onDown = (e: PointerEvent) => {
      if (attribRef.current && !attribRef.current.contains(e.target as Node)) {
        setAttribOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAttribOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [attribOpen]);
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

  const initialLoc = useRef(location);
  useEffect(() => {
    setSelected(null);
    // A location switch after mount flies to the new area, as before.
    // (Compared against the mount-time location so StrictMode remounts stay put.)
    if (
      initialLoc.current.lat !== location.lat ||
      initialLoc.current.lon !== location.lon
    ) {
      setView('local');
    }
  }, [location, location.lat, location.lon]);

  const goTo = (v: 'local' | 'region') => {
    setView(v);
    setFitNonce((n) => n + 1);
  };
  const windNow =
    wind?.windDirectionFromDeg != null && wind.windSpeedMs != null
      ? { ...windSummary(wind.windDirectionFromDeg, t), kmh: msToKmh(wind.windSpeedMs) }
      : null;

  return (
    <div
      ref={containerRef}
      style={{ '--map-sheet-h': `${chromePad.sheetH}px` } as React.CSSProperties}
      className="relative h-[calc(var(--app-vh)-var(--mobile-tabbar-h)-env(safe-area-inset-bottom))] w-full overflow-hidden bg-background lg:h-dvh"
    >
      {!mapFailed ? (
        <HotspotMap
          center={location}
          hotspots={shown}
          showHotspots={on('hotspots')}
          showDensity={on('density')}
          showWind={on('wind')}
          density={on('density') ? density : null}
          fitTo={view === 'region' ? BORNEO_RENDER_BBOX : view === 'local' ? localBox : INDONESIA_BBOX}
          initialCamera={focus}
          autoFit={focus == null}
          fitPadding={fitPadding}
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
        <MapFallback
          count={shown.length}
          items={shown.slice(0, FALLBACK_LIMIT)}
          truncated={shown.length > FALLBACK_LIMIT}
          pending={hotspots.isPending || regional.query.isPending}
          timeZone={tz}
        />
      )}

      {/* Top chrome */}
      <div
        ref={topRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 space-y-2 bg-gradient-to-b from-background/80 to-transparent px-3 pb-6 pt-[max(env(safe-area-inset-top),0.75rem)]"
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

      {/* Right-side controls: stacked just above the card, the same way on both
          breakpoints (card bottom gap + card height + 12px). */}
      <div className="absolute bottom-[calc(var(--map-sheet-h)+1.5rem)] right-3 z-10 flex flex-col gap-2 lg:bottom-[calc(var(--map-sheet-h)+3rem)]">
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
        <div ref={attribRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAttribOpen((v) => !v)}
            aria-label={t.map.attribution}
            aria-expanded={attribOpen}
            className={cn('glass size-11 rounded-full', attribOpen && 'text-haze')}
          >
            <Icon icon={InformationCircleIcon} />
          </Button>
          {attribOpen && (
            <div
              role="dialog"
              aria-label={t.map.attribution}
              className="glass absolute right-[calc(100%+8px)] top-1/2 w-max max-w-[min(280px,100vw-32px)] -translate-y-1/2 whitespace-normal rounded-2xl p-3 text-xs leading-relaxed"
            >
              <p>
                ©{' '}
                <a
                  href="https://carto.com/attributions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  CARTO
                </a>{' '}
                · ©{' '}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  OpenStreetMap
                </a>{' '}
                contributors
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet. The map container already subtracts the mobile tab bar, so the
          12px gap is measured from the container edge; adding --bottom-nav-h here again
          would float the card ~tab bar higher than it needs to be. */}
      <div
        ref={sheetRef}
        className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-lg lg:bottom-6"
      >
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
              <div className="flex items-center gap-1">
                <p className="tabular text-sm font-semibold text-haze">
                  {t.map.plumesHours(plumeHours)}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPlumesOpen((v) => !v)}
                  aria-expanded={plumesOpen}
                  aria-controls="plumes-body"
                  aria-label={t.map.plumesTitle}
                  title={t.map.plumesTitle}
                  className="size-8 rounded-full"
                >
                  <Icon
                    icon={ArrowDown01Icon}
                    className={cn('size-4 transition-transform', plumesOpen && 'rotate-180')}
                  />
                </Button>
              </div>
            </div>

            {plumesOpen && (
              <div id="plumes-body">
                <Slider
                  className="mt-2"
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
                  className="mt-2 h-1.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #f472b6, #a855f7, rgba(99,102,241,0.15))',
                  }}
                />
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
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
                  {t.map.plumesNote} {isDemo ? t.map.creditDemo : t.map.creditLive}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
