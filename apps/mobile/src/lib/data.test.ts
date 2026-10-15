import { afterEach, describe, expect, it, vi } from 'vitest';
import raw from '../../../../fixtures/scenario-kubu-raya.json';
import { demoClient, DEMO_LOCATION } from './demo';
import { createApiClient } from './api';
import { lineSegments } from './chart';

afterEach(() => vi.unstubAllGlobals());

describe('native data contract', () => {
  it('keeps the redesigned exposure timeline and regional wind tied to demo provenance', async () => {
    const exposure = await demoClient.exposure(DEMO_LOCATION);
    expect(exposure.hours[0]?.validAt).toBe(raw.meta.referenceTime);
    expect(exposure.method).toBe('deterministic_indicators');
    expect(exposure.provenance.every((p) => p.isDemo && p.kind === 'fixture')).toBe(true);
    const missing = await demoClient.exposure({ lat: -6.2, lon: 106.8 });
    expect(missing.state).toBe('insufficient');
    expect(missing.summary.peakLevel).toBe('unknown');
    expect(missing.hours).toEqual([]);
    const field = await demoClient.windField([108, -4, 118, 7]);
    expect(field.validAt).toBe(raw.meta.referenceTime);
    expect(field.points.every((p) => p.provenance.isDemo && p.provenance.kind === 'fixture')).toBe(
      true,
    );
  });
  it('uses the existing fixture and pinned reference time', async () => {
    const result = await demoClient.conditions(DEMO_LOCATION);
    expect(result.airQuality.pm25UgM3).toBe(raw.hours[0]!.airQuality.pm25UgM3);
    expect(result.airQuality.provenance.validAt).toBe(raw.meta.referenceTime);
    expect(result.airQuality.provenance.isDemo).toBe(true);
    expect(result.state).toBe('demo');
    const forecast = await demoClient.forecast(DEMO_LOCATION);
    expect(forecast.hours[0]!.validAt).toBe(raw.meta.referenceTime);
    expect(forecast.hours.every((hour) => hour.airQuality.provenance.isDemo)).toBe(true);
  });
  it('never applies Kubu Raya measurements outside coverage', async () => {
    const result = await demoClient.conditions({ lat: -6.2, lon: 106.8 });
    expect(result.state).toBe('insufficient');
    expect(result.airQuality.pm25UgM3).toBeNull();
    expect(result.airQuality.aqi).toBeNull();
    expect(result.weather).toBeNull();
    expect(result.trend).toBe('unknown');
    expect((await demoClient.forecast({ lat: -6.2, lon: 106.8 })).hours).toEqual([]);
  });
  it('filters detections by requested bounds and fixture time', async () => {
    const bbox: [number, number, number, number] = [109, -1, 110, 1];
    const result = await demoClient.hotspots(bbox);
    expect(result.hotspots.length).toBeGreaterThan(0);
    for (const hotspot of result.hotspots) {
      expect(hotspot.lon).toBeGreaterThanOrEqual(bbox[0]);
      expect(hotspot.lon).toBeLessThanOrEqual(bbox[2]);
      expect(Date.parse(hotspot.acquiredAt)).toBeLessThanOrEqual(
        Date.parse(raw.meta.referenceTime),
      );
      expect(hotspot.provenance.isDemo).toBe(true);
    }
    expect((await demoClient.hotspots([105, -7, 107, -5])).hotspots).toEqual([]);
  });
  it('exposes no trained or evaluated model in offline demo', async () => {
    const result = await demoClient.insights(DEMO_LOCATION);
    expect(result.model).toEqual({
      method: 'deterministic_indicators',
      modelVersion: null,
      evaluated: false,
    });
    expect(result.factors.map((f) => f.id)).toEqual(['pm25_trend', 'wind', 'upwind_hotspots']);
  });
  it('rejects API contract drift without substituting a demo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(
      createApiClient('https://example.invalid').conditions(DEMO_LOCATION),
    ).rejects.toThrow();
  });
  it('keeps missing values returned by the API as null', async () => {
    const payload = await demoClient.conditions(DEMO_LOCATION);
    payload.state = 'insufficient';
    payload.airQuality.pm25UgM3 = null;
    payload.airQuality.aqi = null;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
    const result = await createApiClient('https://example.invalid').conditions(DEMO_LOCATION);
    expect(result.airQuality.pm25UgM3).toBeNull();
    expect(result.state).toBe('insufficient');
  });
  it('shows server failures rather than silently returning cached fixture values', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: { code: 'not_implemented', message: 'Unavailable' } }),
            { status: 501 },
          ),
        ),
    );
    await expect(
      createApiClient('https://example.invalid').forecast(DEMO_LOCATION),
    ).rejects.toThrow('not_implemented');
  });
});
describe('forecast drawing', () => {
  it('breaks lines at missing values and preserves measured zeros', () => {
    const result = lineSegments([10, null, 0, 20, null], 100, 100);
    expect(result.segments.map((segment) => segment.length)).toEqual([1, 2]);
    expect(result.segments[1]![0]!.y).toBe(100);
    expect(result.hasData).toBe(true);
  });
  it('has no chart data when all measurements are missing', () => {
    expect(lineSegments([null, null], 100, 100).hasData).toBe(false);
  });
});
