import { bearingToCompass16, windFromToFlowBearing, type BBox } from '@pavana/shared';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from 'lucide-react';
import { useState } from 'react';
import { DemoBanner } from '@/components/DemoBanner';
import { QueryState } from '@/components/QueryState';
import { Card } from '@/components/ui/card';
import { useSelectedLocation } from '@/features/location/location-context';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { HotspotMap } from './HotspotMap';

/** Hotspot search window around the selected location, in degrees. */
const PAD_DEG = 2.5;

export default function MapPage() {
  const t = useCopy();
  const { location } = useSelectedLocation();
  const [showHotspots, setShowHotspots] = useState(true);
  const [mapFailed, setMapFailed] = useState(false);
  const conditions = useConditions();

  const bbox: BBox = [
    location.lon - PAD_DEG,
    location.lat - PAD_DEG,
    location.lon + PAD_DEG,
    location.lat + PAD_DEG,
  ];
  const hotspots = useQuery({
    queryKey: ['hotspots', ...bbox],
    queryFn: ({ signal }) => api.hotspots(bbox, signal),
  });

  const tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  const wind = conditions.data?.weather;

  return (
    <div className="space-y-4">
      <h1 className="pt-2 font-display text-3xl font-medium tracking-tight">{t.map.title}</h1>
      {hotspots.data?.state === 'demo' && <DemoBanner />}

      <div role="group" aria-label="Layer" className="flex gap-2">
        <button
          aria-pressed={showHotspots}
          onClick={() => setShowHotspots((v) => !v)}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm',
            showHotspots
              ? 'border-primary-strong bg-primary-soft font-medium text-primary-strong'
              : 'border-border text-ink-muted',
          )}
        >
          {t.map.layerHotspots}
        </button>
      </div>

      <QueryState query={hotspots}>
        {(h) => (
          <>
            {!mapFailed ? (
              <div className="relative h-[55vh] min-h-80 overflow-hidden rounded-card border border-border">
                <HotspotMap
                  center={location}
                  hotspots={h.hotspots}
                  showHotspots={showHotspots}
                  timeZone={tz}
                  onError={() => setMapFailed(true)}
                />
                {wind?.windDirectionFromDeg != null && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-xs shadow">
                    <Navigation
                      className="size-4 text-primary-strong"
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

            <Card className="space-y-2 text-sm">
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
              <p className="text-xs text-ink-muted">{t.map.hotspotDisclaimer}</p>
            </Card>

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
