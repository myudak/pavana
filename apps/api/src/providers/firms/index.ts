/**
 * NASA FIRMS hotspot adapter — NOT IMPLEMENTED YET (scaffold only).
 *
 * Docs: https://firms.modaps.eosdis.nasa.gov/api/area/
 *   GET /api/area/csv/{MAP_KEY}/{SOURCE}/{west,south,east,north}/{DAY_RANGE}[/{DATE}]
 *   SOURCE e.g. VIIRS_SNPP_NRT, VIIRS_NOAA20_NRT, MODIS_NRT
 *
 * Implementation notes:
 * - MAP_KEY lives server-side only (`FIRMS_MAP_KEY`); never expose it to the browser.
 * - Combine `acq_date` + `acq_time` (HHMM, UTC) into `acquiredAt`.
 * - Map `frp` → `frpMw`; VIIRS confidence l/n/h → low/nominal/high.
 * - A detection is a thermal anomaly, not a confirmed fire or perimeter.
 * - Respect transaction limits; cache per bbox/day; validate bbox size.
 */
import { NotImplementedError } from '../../domain/errors';
import type { HotspotProvider } from '../types';

export function createFirmsProvider(mapKey: string | undefined): HotspotProvider {
  return {
    id: 'nasa-firms',
    async getHotspots() {
      if (!mapKey) throw new NotImplementedError('NASA FIRMS provider (FIRMS_MAP_KEY missing)');
      throw new NotImplementedError('NASA FIRMS provider');
    },
  };
}
