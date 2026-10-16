import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/Icon';
import { Link } from 'react-router';
import { QueryState } from '@/components/QueryState';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import type { BBox } from '@pavana/shared';
import { useMemo } from 'react';
import { HotspotMap } from './HotspotMap';
import { useHotspots } from './use-hotspots';

/** Preview half-span in degrees: close enough to read, wide enough to show nearby detections. */
const PREVIEW_HALF_SPAN_DEG = 0.6;

/**
 * Concise Home map preview (real hotspot data, no exploration controls).
 * The whole preview links to the full Map page.
 */
export function MapPreview() {
  const t = useCopy();
  const { location, query: hotspots } = useHotspots();
  const conditions = useConditions();
  const box = useMemo(
    () =>
      [
        location.lon - PREVIEW_HALF_SPAN_DEG,
        location.lat - PREVIEW_HALF_SPAN_DEG,
        location.lon + PREVIEW_HALF_SPAN_DEG,
        location.lat + PREVIEW_HALF_SPAN_DEG,
      ] as BBox,
    [location.lon, location.lat],
  );
  const wind = conditions.data?.weather;
  const windProp =
    wind?.windDirectionFromDeg != null && wind.windSpeedMs != null
      ? { fromDeg: wind.windDirectionFromDeg, speedMs: wind.windSpeedMs }
      : null;

  return (
    <QueryState query={hotspots}>
      {(h) => (
        <div className="relative h-52 overflow-hidden rounded-2xl">
          <HotspotMap
            center={location}
            hotspots={h.hotspots}
            showHotspots
            fitTo={box}
            onError={() => {}}
            animatedWind={false}
            interactive={false}
            attributionPosition="bottom-left"
            wind={windProp}
          />
          <Link
            to="/peta"
            aria-label={t.map.openFull}
            className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
          >
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 glass rounded-full px-3 py-1.5 text-xs font-medium shadow">
              {t.map.openFull} <Icon icon={ArrowRight01Icon} className="size-3.5" />
            </span>
          </Link>
        </div>
      )}
    </QueryState>
  );
}
