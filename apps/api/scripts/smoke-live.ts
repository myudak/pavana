/**
 * Manual live smoke check against the REAL upstream APIs (never run in CI).
 *
 *   pnpm --filter @pavana/api smoke:live
 *
 * Reads keys from the repo-root .env (FIRMS_MAP_KEY, OPENAQ_API_KEY). Prints per-source
 * status and a few values for two places; never prints keys.
 */
import { loadConfig } from '../src/config/env';
import { createLiveBundle } from '../src/providers';
import { getConditions } from '../src/services/conditions';
import { getExposure } from '../src/services/exposure';
import { getSources } from '../src/services/sources';
import { getWeatherReference } from '../src/services/weather-reference';

const PLACES = [
  { name: 'Sungai Raya (Kubu Raya)', lat: -0.1, lon: 109.38 },
  { name: 'Palangka Raya', lat: -2.21, lon: 113.92 },
];

const config = loadConfig();
const p = createLiveBundle({ ...config, PAVANA_MODE: 'live' });

const sources = await getSources(p);
console.log('\nSources');
for (const s of sources.sources) {
  console.log(`  ${s.status.padEnd(15)} ${s.name}${s.detail ? ` — ${s.detail}` : ''}`);
}

for (const place of PLACES) {
  console.log(`\n${place.name}`);
  try {
    const c = await getConditions(p, place);
    const w = c.weather;
    console.log(
      `  ${c.location.name} · ${c.location.timezone} · state ${c.state}` +
        `\n  PM2.5 (CAMS) ${c.airQuality.pm25UgM3 ?? '—'} µg/m³ · AQI ${c.airQuality.aqi?.value ?? '—'}` +
        `\n  wind from ${w?.windDirectionFromDeg ?? '—'}° at ${w?.windSpeedMs ?? '—'} m/s · ${w?.temperatureC ?? '—'}°C` +
        `\n  station: ${c.station ? `${c.station.name} ${c.station.airQuality.pm25UgM3} µg/m³ (${c.station.distanceKm} km)` : 'none nearby/fresh'}`,
    );
    const e = await getExposure(p, place, 24);
    console.log(
      `  exposure peak ${e.summary.peakLevel} at ${e.summary.peakAt ?? '—'} · hotspots ${e.summary.hotspotsAvailable ? e.summary.hotspotsConsidered : 'unavailable'}`,
    );
    const r = await getWeatherReference(p, place);
    console.log(
      `  BMKG: ${r.state}${r.place ? ` · ${r.place} · next ${r.hours[0]?.validAt} ${r.hours[0]?.temperatureC}°C ${r.hours[0]?.description}` : ''}`,
    );
  } catch (err) {
    console.log(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
  }
}
