import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/Icon';
import { Link } from 'react-router';
import { QueryState } from '@/components/QueryState';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import { useDarkMode } from '@/lib/theme-context';
import { HotspotMap } from './HotspotMap';
import { DARK_STYLE_URL, useHotspots } from './use-hotspots';

/**
 * Concise Home map preview (real hotspot data, no exploration controls).
 * The whole preview links to the full Map page.
 */
export function MapPreview() {
  const t = useCopy();
  const { location, query: hotspots } = useHotspots();
  const conditions = useConditions();
  const dark = useDarkMode();
  const tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
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
            timeZone={tz}
            onError={() => {}}
            styleUrl={dark ? DARK_STYLE_URL : undefined}
            animatedWind={false}
            controls={false}
            wind={windProp}
          />
          <Link
            to="/peta"
            aria-label={t.map.openFull}
            className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
          >
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 glass rounded-full px-3 py-1.5 text-xs font-medium shadow">
              {t.map.openFull} <Icon icon={ArrowRight01Icon} className="size-3.5" />
            </span>
          </Link>
        </div>
      )}
    </QueryState>
  );
}
