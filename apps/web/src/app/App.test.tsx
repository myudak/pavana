import { fireEvent, render, screen } from '@testing-library/react';
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
  '/api/forecast/daily': {
    location: scenario.location,
    state: 'demo',
    days: [],
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
  '/api/hotspots': {
    state: 'demo',
    bbox: [106, -3, 112, 2],
    hotspots: [],
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

describe('Today page', () => {
  it('shows the demo label, PM2.5 with units and a trend headline', async () => {
    renderAt('/');
    expect(await screen.findByText('Mode Demo \u00B7 Data ilustratif')).toBeInTheDocument();
    expect(screen.getAllByText('Kualitas udara diperkirakan memburuk').length).toBeGreaterThan(0);
    expect(screen.getAllByText('\u00B5g/m\u00B3').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/pavana-fixture/).length).toBeGreaterThan(0);
  });

  it('renders the five primary nav destinations', async () => {
    renderAt('/');
    for (const label of ['Home', 'Peta', 'Tanya', 'Prakiraan', 'Info']) {
      expect((await screen.findAllByRole('link', { name: label })).length).toBeGreaterThan(0);
    }
  });
});

describe('Forecast page', () => {
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

describe('Tanya Pavi (demo chat)', () => {
  beforeAll(async () => {
    await import('@/features/chat/ChatPage');
  }, 60_000);

  it('greets, then answers a suggestion with a tool card and demo labels', async () => {
    renderAt('/tanya');
    expect(
      await screen.findByRole('heading', { name: 'Hai, aku Pavi!' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Contoh percakapan \u00B7 data demo Sungai Raya')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kualitas udara sekarang?' }));
    expect(
      await screen.findByText('Cek kualitas udara', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('33,9', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText(/bukan saran medis atau peringatan resmi/)).toBeInTheDocument();
  }, 30_000);
});
