// Evaluates the served boosters (apps/api/src/models) on their archived demo inputs and writes
// src/data/model-demo.json for the model scene. Re-run after the models change:
//   node apps/video/scripts/build-model-demo.ts
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  predictProba,
  rankContributions,
  shapContributions,
  type GbdtModel,
} from '../../../packages/shared/src/model/gbdt.ts';
import riskModel from '../../api/src/models/hotspot-risk.model.json' with { type: 'json' };
import riskDemo from '../../api/src/models/hotspot-risk.demo.json' with { type: 'json' };
import grid from '../../api/src/models/hotspot-risk.grid.json' with { type: 'json' };
import riskMeta from '../../api/src/models/hotspot-risk.meta.json' with { type: 'json' };
import h6 from '../../api/src/models/haze-6h.model.json' with { type: 'json' };
import h24 from '../../api/src/models/haze-24h.model.json' with { type: 'json' };
import hazeDemo from '../../api/src/models/haze.demo.json' with { type: 'json' };
import hazeMeta from '../../api/src/models/haze.meta.json' with { type: 'json' };

const R = riskModel as unknown as GbdtModel;
const cellById = new Map(grid.cells.map((c) => [c.id, c]));
const cells = riskDemo.rows.map((r) => {
  const x = r.x as (number | null)[];
  const p = x.some((v) => v === null) ? null : predictProba(R, x);
  const c = cellById.get(r.cell)!;
  return { id: r.cell, lat: c.lat, lon: c.lon, p, observed: r.observedNextDay, x };
});
const ranked = cells.filter((c) => c.p !== null).sort((a, b) => b.p! - a.p!);
const explain = (m: GbdtModel, x: (number | null)[]) =>
  rankContributions(m, x, shapContributions(m, x))
    .slice(0, 3)
    .map(({ feature, value, shap }) => ({ feature, value, shap }));
const top = ranked[0]!;
// Cell nearest Sungai Raya (Kubu Raya), the demo location.
const home = [...cells].sort(
  (a, b) => Math.hypot(a.lat + 0.1, a.lon - 109.38) - Math.hypot(b.lat + 0.1, b.lon - 109.38),
)[0]!;

const hazeRows = hazeDemo.rows.map((r) => {
  const x = r.x as (number | null)[];
  return {
    station: r.station,
    p6: predictProba(h6 as unknown as GbdtModel, x),
    p24: predictProba(h24 as unknown as GbdtModel, x),
    factors24: explain(h24 as unknown as GbdtModel, x),
    observed: r.observed,
  };
});

const out = {
  risk: {
    version: riskMeta.version,
    issueDay: riskDemo.issueDay,
    test: riskMeta.metrics.test,
    testWindow: riskMeta.windows.test,
    cells: cells.map(({ id, lat, lon, p, observed }) => ({
      id,
      lat,
      lon,
      p: p === null ? null : Math.round(p * 1000) / 1000,
      observed,
    })),
    top: { id: top.id, lat: top.lat, lon: top.lon, p: top.p, factors: explain(R, top.x) },
    home: { id: home.id, lat: home.lat, lon: home.lon, p: home.p, factors: explain(R, home.x) },
  },
  haze: {
    version: hazeMeta.version,
    issueAt: hazeDemo.issueAt,
    windows24h: hazeMeta.horizons['24h'].windows,
    stations: hazeMeta.stations.map(
      (s: { icao: string; name: string; lat: number; lon: number }) => ({
        ...s,
        ...hazeRows.find((h) => h.station === s.icao),
      }),
    ),
  },
};
writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'model-demo.json'),
  JSON.stringify(out, null, 2) + '\n',
);
console.log(
  'cells',
  cells.length,
  'withP',
  ranked.length,
  'top',
  top.p?.toFixed(3),
  top.lat,
  top.lon,
  'home',
  home.p?.toFixed(3),
  home.lat,
  home.lon,
);
console.log(JSON.stringify(out.risk.top.factors), JSON.stringify(out.risk.home.factors));
console.log(hazeRows.map((h) => `${h.station} ${h.p6.toFixed(3)}/${h.p24.toFixed(3)}`).join(' '));
