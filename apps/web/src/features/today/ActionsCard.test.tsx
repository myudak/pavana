import type { UseQueryResult } from '@tanstack/react-query';
import type { ConditionsResponse } from '@pavana/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import scenario from '../../../../../fixtures/scenario-kubu-raya.json';
import { ActionsCard } from './ActionsCard';

function queryWith(pm25: number | null) {
  const h0 = scenario.hours[0]!;
  const data = {
    location: scenario.location,
    state: 'demo',
    airQuality: { ...h0.airQuality, pm25UgM3: pm25 },
    weather: h0.weather,
    trend: 'worsening',
  } as unknown as ConditionsResponse;
  return { isPending: false, isError: false, data } as UseQueryResult<ConditionsResponse>;
}

function renderCard(pm25: number | null) {
  return render(
    <MemoryRouter>
      <ActionsCard query={queryWith(pm25)} />
    </MemoryRouter>,
  );
}

describe('ActionsCard', () => {
  it('shows up to three advice rows from existing data (general + category)', () => {
    renderCard(33.9);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(
      screen.getByText('Pantau pembaruan dari sumber resmi (BMKG, BPBD setempat).'),
    ).toBeInTheDocument();
    // 33.9 µg/m³ → moderate: the per-category health advice is appended.
    expect(screen.getByText(/mengurangi aktivitas luar ruangan yang berat/)).toBeInTheDocument();
  });

  it('omits category advice without data and keeps the disclaimer visible', () => {
    renderCard(null);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Saran umum, bukan nasihat medis.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sumber resmi' })).toHaveAttribute('href', '/info');
  });
});
