import type { ForecastHour } from '@pavana/shared';
import { windFromToFlowBearing } from '@pavana/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HourlyTimeline } from './HourlyTimeline';

function hour(
  validAt: string,
  pm25: number | null,
  ms: number | null = 5,
  fromDeg: number | null = 134,
) {
  return {
    validAt,
    airQuality: { pm25UgM3: pm25 },
    weather:
      ms === null && fromDeg === null
        ? null
        : { windSpeedMs: ms, windDirectionFromDeg: fromDeg },
  } as unknown as ForecastHour;
}

const HOURS = [
  hour('2026-09-15T00:00:00Z', 33.9),
  hour('2026-09-15T01:00:00Z', 32.6),
  hour('2026-09-15T02:00:00Z', null, null, null),
  hour('2026-09-15T03:00:00Z', 40.1, 2, 90),
  hour('2026-09-15T04:00:00Z', 12.4, 0, 0),
  hour('2026-09-15T05:00:00Z', 55.5, 10, 270),
];

describe('HourlyTimeline strip', () => {
  it('renders 6 sequential cells with the first labelled "Kini"', () => {
    render(<HourlyTimeline hours={HOURS} timeZone="Asia/Pontianak" variant="strip" />);
    const cells = screen.getAllByRole('listitem');
    expect(cells).toHaveLength(6);
    expect(within(cells[0]!).getByText('Kini')).toBeInTheDocument();
  });

  it('renders "—" for missing PM2.5 and "-" without an arrow for missing wind', () => {
    render(<HourlyTimeline hours={HOURS} timeZone="Asia/Pontianak" variant="strip" />);
    const cells = screen.getAllByRole('listitem');
    const nullCell = cells[2]!;
    expect(within(nullCell).getByText('—')).toBeInTheDocument();
    expect(within(nullCell).getByText('-')).toBeInTheDocument();
    expect(within(nullCell).queryByRole('img', { hidden: true })).toBeNull();
    expect(nullCell.querySelector('svg')).toBeNull();
  });

  it('shows wind speed in km/h with an arrow rotated by the flow bearing', () => {
    render(<HourlyTimeline hours={HOURS} timeZone="Asia/Pontianak" variant="strip" />);
    const cells = screen.getAllByRole('listitem');
    // 5 m/s → 18 km/jam; 134° FROM → 314° flow bearing.
    expect(within(cells[0]!).getByText('18 km/jam')).toBeInTheDocument();
    const arrow = cells[0]!.querySelector('svg');
    expect(arrow).not.toBeNull();
    expect(arrow!.getAttribute('style')).toContain(
      `rotate(${windFromToFlowBearing(134)}deg)`,
    );
    // 2 m/s → 7 km/jam (rounded).
    expect(within(cells[3]!).getByText('7 km/jam')).toBeInTheDocument();
  });

  it('hides the wind row below the sm breakpoint via CSS (stays in the DOM)', () => {
    render(<HourlyTimeline hours={HOURS} timeZone="Asia/Pontianak" variant="strip" />);
    const cells = screen.getAllByRole('listitem');
    // 5 m/s → 18 km/jam; hidden on <sm, visible sm+ — CSS only so it stays queryable.
    const wind = within(cells[0]!).getByText('18 km/jam');
    expect(wind.closest('span')).toHaveClass('hidden');
  });

  it('keeps a screen-reader category label in every cell (never color-only)', () => {
    render(<HourlyTimeline hours={HOURS} timeZone="Asia/Pontianak" variant="strip" />);
    const cells = screen.getAllByRole('listitem');
    for (const cell of cells) {
      // Each cell carries an sr-only "Kategori, µg/m³" note.
      expect(cell.textContent).toMatch(/µg\/m³/);
    }
  });
});
