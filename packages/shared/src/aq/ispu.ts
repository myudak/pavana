/**
 * Indonesian ISPU (Indeks Standar Pencemar Udara) for PM2.5.
 *
 * ⚠️ NOT YET VERIFIED. Breakpoints below are a draft transcription of
 * PermenLHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020 and MUST be checked against the
 * regulation text before this is shown to users. Until then the UI shows PM2.5 in
 * µg/m³ plus an indicative US AQI category, and `ISPU_VERIFIED` stays false.
 */
export const ISPU_VERIFIED = false;

export type IspuCategory = 'baik' | 'sedang' | 'tidak_sehat' | 'sangat_tidak_sehat' | 'berbahaya';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
  category: IspuCategory;
}

// TODO(verify): confirm against P.14/2020 Lampiran.
const PM25_BREAKPOINTS_DRAFT: readonly Breakpoint[] = [
  { cLow: 0, cHigh: 15.5, iLow: 0, iHigh: 50, category: 'baik' },
  { cLow: 15.5, cHigh: 55.4, iLow: 50, iHigh: 100, category: 'sedang' },
  { cLow: 55.4, cHigh: 150.4, iLow: 100, iHigh: 200, category: 'tidak_sehat' },
  { cLow: 150.4, cHigh: 250.4, iLow: 200, iHigh: 300, category: 'sangat_tidak_sehat' },
  { cLow: 250.4, cHigh: 500, iLow: 300, iHigh: 500, category: 'berbahaya' },
];

/** Draft ISPU computation. Do not surface in UI while `ISPU_VERIFIED` is false. */
export function pm25ToIspuDraft(
  pm25UgM3: number | null,
): { value: number; category: IspuCategory } | null {
  if (pm25UgM3 === null || !Number.isFinite(pm25UgM3) || pm25UgM3 < 0) return null;
  const bp =
    PM25_BREAKPOINTS_DRAFT.find((b) => pm25UgM3 <= b.cHigh) ??
    PM25_BREAKPOINTS_DRAFT[PM25_BREAKPOINTS_DRAFT.length - 1]!;
  const c = Math.min(pm25UgM3, bp.cHigh);
  const value = Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow);
  return { value, category: bp.category };
}
