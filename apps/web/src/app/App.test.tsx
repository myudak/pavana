import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

describe('Today page', () => {
  it('shows the demo label, PM2.5 with units and a trend headline', async () => {
    renderAt('/');
    expect(await screen.findByText('Mode Demo · Data ilustratif')).toBeInTheDocument();
    // The trend headline appears in the hero banner and the forecast panel.
    expect(screen.getAllByText('Kualitas udara diperkirakan memburuk').length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText('µg/m³').length).toBeGreaterThan(0);
    // Provenance renders twice (mobile instance below the banner + desktop
    // instance above the hourly strip); exactly one is visible per breakpoint.
    expect(screen.getAllByText(/pavana-fixture/).length).toBeGreaterThan(0);
  });

  it('renders the four primary nav destinations', async () => {
    renderAt('/');
    for (const label of ['Home', 'Peta', 'Insight', 'Info']) {
      expect((await screen.findAllByRole('link', { name: label })).length).toBeGreaterThan(0);
    }
  });
});
