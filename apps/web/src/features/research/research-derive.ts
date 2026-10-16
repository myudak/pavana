import type { ResearchBundle, ResearchCase } from '@pavana/shared';

/** Sort by magnitude for readability and retain the exact omitted contribution as a final row. */
export function localContributions(bundle: ResearchBundle, sample: ResearchCase) {
  const rows = bundle.features
    .map((feature, index) => ({
      feature,
      value: sample.featureValues[index] ?? null,
      shap: sample.shapValuesUgM3[index]!,
    }))
    .sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
  return { top: rows.slice(0, 6), other: rows.slice(6).reduce((sum, row) => sum + row.shap, 0) };
}
