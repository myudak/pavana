import { pm25ToUsAqi, type UsAqiCategory } from '@pavana/shared';

/** Tailwind classes per category. Always render alongside the text label — never color-only. */
export const AQ_STYLE: Record<
  UsAqiCategory | 'unknown',
  { dot: string; text: string; soft: string }
> = {
  good: { dot: 'bg-aq-good', text: 'text-aq-good', soft: 'bg-aq-good/15' },
  moderate: { dot: 'bg-aq-moderate', text: 'text-aq-moderate', soft: 'bg-aq-moderate/15' },
  unhealthy_sensitive: { dot: 'bg-aq-usg', text: 'text-aq-usg', soft: 'bg-aq-usg/15' },
  unhealthy: { dot: 'bg-aq-unhealthy', text: 'text-aq-unhealthy', soft: 'bg-aq-unhealthy/15' },
  very_unhealthy: {
    dot: 'bg-aq-very-unhealthy',
    text: 'text-aq-very-unhealthy',
    soft: 'bg-aq-very-unhealthy/15',
  },
  hazardous: { dot: 'bg-aq-hazardous', text: 'text-aq-hazardous', soft: 'bg-aq-hazardous/15' },
  unknown: { dot: 'bg-aq-unknown', text: 'text-ink-muted', soft: 'bg-aq-unknown/15' },
};

/** Category for a PM2.5 value, or `unknown` for missing data (never "good"). */
export function categoryOf(pm25: number | null): UsAqiCategory | 'unknown' {
  return pm25ToUsAqi(pm25)?.category ?? 'unknown';
}

/** CSS variable per category, for canvas/SVG consumers (MapLibre, Recharts). */
export const AQ_CSS_VAR: Record<UsAqiCategory | 'unknown', string> = {
  good: '--pv-aq-good',
  moderate: '--pv-aq-moderate',
  unhealthy_sensitive: '--pv-aq-usg',
  unhealthy: '--pv-aq-unhealthy',
  very_unhealthy: '--pv-aq-very-unhealthy',
  hazardous: '--pv-aq-hazardous',
  unknown: '--pv-aq-unknown',
};

export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
