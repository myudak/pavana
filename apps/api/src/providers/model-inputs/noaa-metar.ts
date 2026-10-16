/** NOAA AWC recent METAR fallback. Original whole reports; no field-level merging. */
import { normaliseMetarWx, type MetarReport } from '@pavana/shared';

export function parseNoaaMetar(payload: unknown, asOf: Date): Map<string, MetarReport[]> {
  if (!Array.isArray(payload)) throw new Error('Invalid NOAA METAR response');
  const out = new Map<string, MetarReport[]>();
  const number = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  for (const value of payload) {
    if (!value || typeof value !== 'object') continue;
    const r = value as Record<string, unknown>;
    const station = r['icaoId'],
      time = number(r['obsTime']);
    if (typeof station !== 'string' || !/^[A-Z]{4}$/.test(station) || time === null) continue;
    const t = time * 1000;
    const received = typeof r['receiptTime'] === 'string' ? Date.parse(r['receiptTime']) : null;
    if (
      t > asOf.getTime() ||
      t < asOf.getTime() - 74 * 3_600_000 ||
      (received !== null && received > asOf.getTime())
    )
      continue;
    const speed = number(r['wspd']),
      dir = number(r['wdir']);
    const vis =
      typeof r['visib'] === 'string' && /^\d+(?:\.\d+)?$/.test(r['visib'])
        ? Number(r['visib'])
        : number(r['visib']);
    const report: MetarReport = {
      provider: 'noaa-awc',
      validAt: new Date(t).toISOString(),
      vsbyKm: vis !== null && vis >= 0 ? vis * 1.609344 : null,
      wxcodes: normaliseMetarWx(
        typeof r['wxString'] === 'string' ? r['wxString'] : null,
        typeof r['rawOb'] === 'string' ? r['rawOb'] : null,
      ),
      tmpc: number(r['temp']),
      dwpc: number(r['dewp']),
      windSpeedMs: speed !== null && speed >= 0 ? speed * 0.514444 : null,
      windDirFromDeg: dir !== null && dir >= 0 && dir <= 360 ? dir : null,
    };
    if (!out.has(station)) out.set(station, []);
    out.get(station)!.push(report);
  }
  return out;
}
