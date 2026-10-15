import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import scenario from '../../../../../fixtures/scenario-kubu-raya.json';
import { AppProviders, createQueryClient } from '@/app/providers';
import { DailyForecastCard } from './DailyForecastCard';

function day(
  date: string,
  extra: Record<string, unknown>,
  provenance: Record<string, unknown> = {},
) {
  return {
    date,
    rainProbPct: null,
    provenance: {
      provider: 'pavana-fixture',
      kind: 'fixture',
      fetchedAt: '2026-09-15T00:00:00Z',
      validAt: `${date}T00:00:00Z`,
      isDemo: true,
      ...provenance,
    },
    ...extra,
  };
}

const DAYS = [
  day('2026-09-15', {
    pm25Min: 18.2,
    pm25Max: 42.4,
    pm25Mean: 30.1,
    category: 'moderate',
    available: true,
    rainProbPct: 40,
  }),
  day('2026-09-16', {
    pm25Min: 10,
    pm25Max: 30,
    pm25Mean: 20,
    category: 'moderate',
    available: true,
  }),
  ...Array.from({ length: 8 }, (_, i) =>
    day(`2026-09-${17 + i}`, {
      pm25Min: null,
      pm25Max: null,
      pm25Mean: null,
      category: 'unknown',
      available: false,
    }),
  ),
];

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const path = new URL(url, 'http://test').pathname;
      const body =
        path === '/api/forecast/daily'
          ? { location: scenario.location, state: 'demo', days: DAYS }
          : { error: { code: 'not_found', message: path } };
      return new Response(JSON.stringify(body), {
        status: path === '/api/forecast/daily' ? 200 : 404,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
});

function renderCard() {
  return render(
    <AppProviders queryClient={createQueryClient()}>
      <DailyForecastCard timeZone="Asia/Pontianak" nowPm25={30} />
    </AppProviders>,
  );
}

describe('DailyForecastCard', () => {
  it('renders the header and exactly 10 day rows', async () => {
    renderCard();
    expect(await screen.findByText('PRAKIRAAN 10 HARI')).toBeInTheDocument();
    expect(screen.getByText('PM2.5 µg/m³')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByText('Hari ini')).toBeInTheDocument();
  });

  it('labels each available row for screen readers (never color-only)', async () => {
    renderCard();
    expect(
      await screen.findByRole('listitem', {
        name: 'Hari ini: PM2.5 18 sampai 42 µg/m³, kategori Sedang',
      }),
    ).toBeInTheDocument();
  });

  it('renders unavailable rows with "-" for null min/max and a notice', async () => {
    renderCard();
    const rows = await screen.findAllByRole('listitem');
    const missing = rows.slice(2);
    expect(missing).toHaveLength(8);
    expect(screen.getAllByText('Belum tersedia')).toHaveLength(8);
    for (const row of missing) {
      // Mobile: dimmed via muted text only (no bare opacity → contrast ≥3:1).
      // Desktop (lg+) dims the whole row instead.
      expect(row.className).not.toMatch(/(?:^|\s)opacity-/);
      expect(row.className).toMatch(/lg:opacity-\[0\.45\]/);
      // null min/max render as "-", never 0 or a "good" state.
      expect(within(row).getAllByText('-').length).toBeGreaterThan(0);
      expect(row.textContent).not.toMatch(/\b0\b/);
    }
  });

  it('shows rain probability when the provider supplies it', async () => {
    renderCard();
    expect(await screen.findByText('40%')).toBeInTheDocument();
  });

  it('renders no footer notes — per-day notices carry the availability state', async () => {
    renderCard();
    await screen.findAllByRole('listitem');
    expect(
      screen.queryByText(
        'Jangkauan prakiraan kualitas udara terbatas oleh provider; hari berikutnya belum tersedia.',
      ),
    ).toBeNull();
    expect(screen.queryByText(/^Sumber:/)).toBeNull();
  });

  it('shows short category labels and a min-mean-max tooltip on each bar', async () => {
    renderCard();
    expect(await screen.findByTitle('Min 18 · Rata-rata 30 · Maks 42 µg/m³')).toBeInTheDocument();
    expect(screen.getAllByText('Sedang')).toHaveLength(2);
  });
});
