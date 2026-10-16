import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hazeFeatures, normaliseMetarWx, type HazeFeatureInput } from '../src/model/haze-features';
import {
  pm25Features,
  windFeatures,
  windFromComponents,
  type CamsInputPoint,
} from '../src/model/regression-features';
import { predictProba, predictRaw, type GbdtModel } from '../src/model/gbdt';
import {
  detectionWindow,
  hotspotFeatures,
  type HotspotGridMeta,
  type DailyWeather,
} from '../src/model/hotspot-features';

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../fixtures/test-vectors/live-features.json'), 'utf8'),
) as Omit<HazeFeatureInput, 'asOf'> & {
  asOf: string;
  cams: CamsInputPoint[];
  haze: { issueAt: string; x: (number | null)[] };
  wind: { issueAt: string; x: (number | null)[] };
  pm25: { issueAt: string; x: (number | null)[] };
  hotspot: {
    grid: HotspotGridMeta;
    cell: HotspotGridMeta['cells'][number];
    issueDay: string;
    weather: DailyWeather;
    detections: { lat: number; lon: number; acquiredAt: string }[];
    cases: { daysSeen: string[]; x: (number | null)[] }[];
  };
};
function matches(
  actual: { issueAt: string; x: (number | null)[] } | null,
  expected: typeof fixture.wind,
) {
  expect(new Date(actual!.issueAt).getTime()).toBe(Date.parse(expected.issueAt));
  expected.x.forEach((v, i) =>
    v === null ? expect(actual!.x[i]).toBeNull() : expect(actual!.x[i]).toBeCloseTo(v, 9),
  );
}
describe('live features match Python, including future and missing reports', () => {
  it('hotspot weather and detections agree, including a missing sensor day', () => {
    const h = fixture.hotspot;
    for (const c of h.cases) {
      const window = detectionWindow(h.grid, h.detections, h.issueDay, new Set(c.daysSeen));
      const x = hotspotFeatures(h.grid, h.cell, window, h.weather, h.issueDay);
      matches(
        { issueAt: `${h.issueDay}T00:00:00Z`, x },
        { issueAt: `${h.issueDay}T00:00:00Z`, x: c.x },
      );
    }
  });
  it('haze rolling boundaries and whole reports', () =>
    matches(hazeFeatures({ ...fixture, asOf: Date.parse(fixture.asOf) }), fixture.haze));
  it('station wind u/v with missing exact lag and calm report', () =>
    matches(
      windFeatures(fixture.reports, fixture.station, Date.parse(fixture.asOf)),
      fixture.wind,
    ));
  it('CAMS lags and means exclude future values', () =>
    matches(pm25Features(fixture.cams, Date.parse(fixture.asOf)), fixture.pm25));
  it('an absent CAMS hour makes the required history unknown', () => {
    const f = pm25Features(
      fixture.cams.filter((_, i) => i !== 50),
      Date.parse(fixture.asOf),
    );
    expect(f!.x[8]).toBeNull();
  });
  it('raw METAR clear weather is distinct from an unknown report', () => {
    expect(normaliseMetarWx(null, 'WIOO 010000Z 01003KT 9999 SCT012 25/24 Q1010 NOSIG')).toBe('');
    expect(normaliseMetarWx(null, 'WIOO 010000Z NIL')).toBeNull();
    expect(normaliseMetarWx(null)).toBeNull();
  });
  it('calm direction is unknown and direction remains meteorological FROM', () => {
    expect(windFromComponents(0.1, 0.1).directionFromDeg).toBeNull();
    expect(windFromComponents(-2, 0).directionFromDeg).toBeCloseTo(90);
  });
  it('regression stays identity-linked and cannot be shown as a probability', () => {
    const model: GbdtModel = {
      format: 'pavana-gbdt-v1',
      objective: 'regression',
      featureNames: ['x'],
      trees: [{ f: [], t: [], d: [], l: [], r: [], ic: [], v: [25], lc: [1] }],
    };
    expect(predictRaw(model, [null])).toBe(25);
    expect(() => predictProba(model, [null])).toThrow('binary');
  });
});
