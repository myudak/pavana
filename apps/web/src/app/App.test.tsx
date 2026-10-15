import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import scenario from '../../../../fixtures/scenario-kubu-raya.json';
import { AppProviders, createQueryClient } from './providers';
import { routes } from './routes';

const h0 = scenario.hours[0]!;

const responses: Record<string, unknown> = {
  '/api/conditions': {
    location: scenario.location,
    state: 'demo',
    airQuality: { ...h0.airQuality, aqi: { value: 97, standard: 'US_EPA', category: 'moderate' } },
    weather: h0.weather,
    trend: 'worsening',
  },
  '/api/forecast': {
    location: scenario.location,
    state: 'demo',
    hours: scenario.hours.map((h) => ({
      validAt: h.validAt,
      airQuality: h.airQuality,
      weather: h.weather,
    })),
  },
  '/api/exposure': {
    location: scenario.location,
    state: 'demo',
    method: 'deterministic_indicators',
    hours: scenario.hours.slice(0, 3).map((h, i) => ({
      validAt: h.validAt,
      level: i === 1 ? 'high' : 'moderate',
      driver: 'upwind',
      pm25UgM3: h.airQuality.pm25UgM3,
      upwind: { score: 40, contributingCount: 10, consideredCount: 12 },
      windFromDeg: h.weather.windDirectionFromDeg,
      windSpeedMs: h.weather.windSpeedMs,
    })),
    summary: {
      peakLevel: 'high',
      peakAt: scenario.hours[1]!.validAt,
      firstElevatedAt: scenario.hours[0]!.validAt,
      hotspotsConsidered: 12,
      radiusKm: 300,
      windowHours: 48,
    },
    provenance: [],
  },
  '/api/insights': {
    location: scenario.location,
    state: 'demo',
    model: { method: 'deterministic_indicators', modelVersion: null, evaluated: false },
    factors: [],
  },
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url, 'http://test').pathname;
      const body = responses[path];
      return new Response(JSON.stringify(body ?? { error: { code: 'not_found', message: path } }), {
        status: body ? 200 : 404,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
});

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('Home page', () => {
  it('answers "will the smoke reach me" with demo label, units and provenance', async () => {
    renderAt('/');
    expect(await screen.findByText('Apakah asap akan sampai ke sini?')).toBeInTheDocument();
    expect(await screen.findByText('Potensi paparan asap tinggi')).toBeInTheDocument();
    expect(screen.getByText('Mode Demo · Data ilustratif')).toBeInTheDocument();
    expect(screen.getAllByText('µg/m³').length).toBeGreaterThan(0);
    expect(screen.getByText(/pavana-fixture/)).toBeInTheDocument();
  });

  it('renders the four primary nav destinations', async () => {
    renderAt('/');
    for (const label of ['Beranda', 'Peta', 'Prakiraan', 'Info']) {
      expect((await screen.findAllByRole('link', { name: label })).length).toBeGreaterThan(0);
    }
  });
});

describe('Forecast page', () => {
  // The route is lazy-loaded. Warm the module first so a cold transform (slow when
  // every package's tests run in parallel) can't eat the findBy timeout.
  beforeAll(async () => {
    await import('@/features/forecast/ForecastPage');
  }, 60_000);

  it('marks the AI model as unfinished', async () => {
    renderAt('/prakiraan');
    expect(
      await screen.findByRole('heading', { name: 'Prakiraan', level: 1 }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Dalam pengembangan')).toBeInTheDocument();
  }, 20_000);
});
