import { ResearchBundleSchema } from '@pavana/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import research from '../../../public/ml/research.json';
import { id } from '@/lib/i18n/id';
import LabPage from './LabPage';
import { localContributions } from './research-derive';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('historical research boundary', () => {
  it('accepts the real export, but rejects changed sums and operational claims', () => {
    expect(ResearchBundleSchema.safeParse(research).success).toBe(true);
    expect(ResearchBundleSchema.safeParse({ ...research, operationalReady: true }).success).toBe(
      false,
    );
    const broken = structuredClone(research);
    broken.cases[0]!.shapValuesUgM3[0]! += 1;
    expect(ResearchBundleSchema.safeParse(broken).success).toBe(false);
  });
  it('keeps omitted contributions in the total rather than dropping them', () => {
    const bundle = ResearchBundleSchema.parse(research);
    const sample = bundle.cases[0]!;
    const { top, other } = localContributions(bundle, sample);
    const reconstructed =
      sample.baseValueUgM3 + top.reduce((sum, row) => sum + row.shap, 0) + other;
    expect(reconstructed).toBeCloseTo(sample.predictionUgM3, 6);
  });
  it('lets the reader change the historical target hour', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(research), { status: 200 })),
    );
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <LabPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: id.lab.title, level: 1 }),
    ).toBeInTheDocument();
    const select = screen.getByLabelText(id.lab.chooseHour) as HTMLSelectElement;
    expect(select.options).toHaveLength(168);
    fireEvent.change(select, { target: { value: '24' } });
    expect(select.value).toBe('24');
    expect(screen.getByText(id.lab.scope)).toBeInTheDocument();
    expect(
      screen.getByText(id.lab.selected(research.modelVariant), { exact: false }),
    ).toBeInTheDocument();
  });
});
