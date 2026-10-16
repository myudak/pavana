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
  // Keep browser storage isolated from Node's experimental localStorage global.
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
  });
  localStorage.setItem('pavana:demo', '1');
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
    for (const label of ['Home', 'Peta', 'Tanya Pavi', 'Prakiraan', 'Info']) {
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

  it('separates experimental model outputs from the historical CAMS research', async () => {
    renderAt('/prakiraan');
    expect(
      await screen.findByRole('heading', { name: 'Prakiraan', level: 1 }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Riset historis')).toBeInTheDocument();
    for (const name of [
      'Angin bandara · t+6 jam',
      'Peluang jarak pandang < 3 km karena kabut asap',
      'Peluang titik panas terdeteksi',
    ]) {
      expect(screen.getByRole('heading', { name, level: 3 })).toBeInTheDocument();
    }
    // The CAMS-proxy PM2.5 model is research-only and has no forecast card.
    expect(screen.queryByRole('heading', { name: 'Estimasi PM2.5 · CAMS t+6 jam' })).toBeNull();
  }, 20_000);

  it('retains hourly weather and smoke forecasts in the new tab layout', async () => {
    const view = renderAt('/prakiraan?tab=weather');
    expect(await screen.findByRole('heading', { name: 'Angin per jam' })).toBeInTheDocument();
    expect(await screen.findByRole('table')).toBeInTheDocument();
    view.unmount();
    renderAt('/prakiraan?tab=smoke');
    expect(
      await screen.findByRole('heading', { name: 'Potensi paparan asap per jam' }),
    ).toBeInTheDocument();
  });
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
    expect(screen.getByText('Contoh percakapan · data demo Sungai Raya')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kualitas udara sekarang?' }));
    expect(
      await screen.findByText('Cek kualitas udara', {}, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByText('33,9', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText(/bukan saran medis atau peringatan resmi/)).toBeInTheDocument();
  }, 30_000);
});

describe('Tanya Pavi (live chat)', () => {
  it('keeps the live API adapter in the redesigned chat', async () => {
    localStorage.setItem('pavana:demo', '0');
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({ reply: 'Respons pengujian Pavi.', model: 'test-model', isDemo: false }),
          { headers: { 'content-type': 'application/json' } },
        ),
    );
    renderAt('/tanya');
    expect(
      await screen.findByText('Jawaban AI dari data lokasi yang kamu pilih'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kualitas udara sekarang?' }));
    expect(await screen.findByText('Respons pengujian Pavi.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Kualitas udara sekarang?'),
      }),
    );
  });
});
