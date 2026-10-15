#!/usr/bin/env node
/**
 * Build apps/api/src/data/regions-id.json — every Indonesian kabupaten/kota with its
 * province and a representative coordinate, from Wikidata (CC0).
 *
 *   node fixtures/scripts/build-regions-id.mjs
 *
 * Used by the live LocationProvider for offline search + nearest-name resolve and the
 * province → time-zone mapping. Re-run when regions change; commit the output.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../../apps/api/src/data/regions-id.json', import.meta.url));

// Regency (Q3191695), city (Q3199141), Jakarta's administrative city (Q4272761) and
// administrative regency (Q11127777); provinces are Q5098 plus Jakarta (Q3630).
const KIND = { Q3191695: 'kabupaten', Q11127777: 'kabupaten', Q3199141: 'kota', Q4272761: 'kota' };
const QUERY = `
SELECT ?item ?itemLabel ?type ?provLabel ?coord WHERE {
  VALUES ?type { wd:Q3191695 wd:Q3199141 wd:Q4272761 wd:Q11127777 }
  ?item wdt:P31 ?type ; wdt:P625 ?coord ; wdt:P131 ?prov .
  { ?prov wdt:P31 wd:Q5098 } UNION { VALUES ?prov { wd:Q3630 } }
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "id,en". }
}`;

const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(QUERY)}`, {
  headers: {
    accept: 'application/sparql-results+json',
    'user-agent': 'pavana-build/0.1 (https://pavana.myudak.com)',
  },
});
if (!res.ok) throw new Error(`Wikidata HTTP ${res.status}`);
const rows = (await res.json()).results.bindings;

const seen = new Map();
for (const r of rows) {
  const id = r.item.value.split('/').pop();
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(r.coord.value);
  if (!m) continue;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  // Skip obviously wrong points (outside Indonesia's extent).
  if (lon < 94 || lon > 142 || lat < -11.5 || lat > 6.5) continue;
  if (seen.has(id)) continue; // several coords/provinces: keep the first
  const kind = KIND[r.type.value.split('/').pop()];
  const label = r.itemLabel.value;
  // Show "Kota Jayapura" vs "Kabupaten Jayapura" unless the label already says so.
  const name = /^(kota|kabupaten)\b/i.test(label)
    ? label
    : `${kind === 'kota' ? 'Kota' : 'Kabupaten'} ${label}`;
  seen.set(id, {
    id: `wd:${id}`,
    name,
    kind,
    province: r.provLabel.value,
    lat: Math.round(lat * 1e4) / 1e4,
    lon: Math.round(lon * 1e4) / 1e4,
  });
}

const regions = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: 'Wikidata (CC0) — regencies (Q3191695) and cities (Q3199141) of Indonesia',
      generatedAt: new Date().toISOString(),
      regions,
    },
    null,
    1,
  ) + '\n',
);
const provinces = new Set(regions.map((r) => r.province));
console.log(`wrote ${regions.length} regions across ${provinces.size} provinces → ${OUT}`);
console.log([...provinces].sort().join(' | '));
