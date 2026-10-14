/**
 * US EPA AQI for PM2.5 (breakpoints from the 2024 NAAQS revision, effective May 2024).
 * NOTE: the official AQI uses a 24-h average (or NowCast). Applying it to a single hourly
 * value is INDICATIVE only — label it that way in the UI.
 */
export type UsAqiCategory =
  'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
  category: UsAqiCategory;
}

const PM25_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50, category: 'good' },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: 'moderate' },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: 'unhealthy_sensitive' },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200, category: 'unhealthy' },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300, category: 'very_unhealthy' },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 500, category: 'hazardous' },
];

/** AQI → category (e.g. 158 → `unhealthy`, NOT "unhealthy for sensitive groups"). */
export function usAqiCategoryFromIndex(aqi: number): UsAqiCategory {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy_sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very_unhealthy';
  return 'hazardous';
}

/**
 * PM2.5 (µg/m³) → US AQI. Returns `null` for null input — never treat missing as 0.
 * Concentrations are truncated to 0.1 µg/m³ per EPA guidance. Values above the top
 * breakpoint are capped at 500.
 */
export function pm25ToUsAqi(
  pm25UgM3: number | null,
): { value: number; category: UsAqiCategory } | null {
  if (pm25UgM3 === null || !Number.isFinite(pm25UgM3) || pm25UgM3 < 0) return null;
  const c = Math.floor(pm25UgM3 * 10) / 10;
  const last = PM25_BREAKPOINTS[PM25_BREAKPOINTS.length - 1]!;
  if (c > last.cHigh) return { value: 500, category: 'hazardous' };
  const bp = PM25_BREAKPOINTS.find((b) => c >= b.cLow && c <= b.cHigh);
  if (!bp) {
    // Falls in a 0.1 gap between breakpoints after truncation — snap to the upper band.
    const upper = PM25_BREAKPOINTS.find((b) => c < b.cLow)!;
    return { value: upper.iLow, category: upper.category };
  }
  const value = Math.round(((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow);
  return { value, category: bp.category };
}
