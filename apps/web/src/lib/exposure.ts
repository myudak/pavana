import type { ExposureLevel } from '@pavana/shared';

/** Tailwind classes per exposure level. Always render with the text label (never color-only). */
export const EXP_STYLE: Record<
  ExposureLevel,
  { dot: string; text: string; soft: string; ring: string }
> = {
  none: {
    dot: 'bg-exp-none',
    text: 'text-exp-none',
    soft: 'bg-exp-none/15',
    ring: 'ring-exp-none/40',
  },
  low: { dot: 'bg-exp-low', text: 'text-exp-low', soft: 'bg-exp-low/15', ring: 'ring-exp-low/40' },
  moderate: {
    dot: 'bg-exp-moderate',
    text: 'text-exp-moderate',
    soft: 'bg-exp-moderate/15',
    ring: 'ring-exp-moderate/40',
  },
  high: {
    dot: 'bg-exp-high',
    text: 'text-exp-high',
    soft: 'bg-exp-high/15',
    ring: 'ring-exp-high/40',
  },
  unknown: {
    dot: 'bg-exp-unknown',
    text: 'text-muted-foreground',
    soft: 'bg-exp-unknown/15',
    ring: 'ring-exp-unknown/40',
  },
};

/** CSS variable per level, for SVG strokes and fills. */
export const EXP_VAR: Record<ExposureLevel, string> = {
  none: 'var(--pv-exp-none)',
  low: 'var(--pv-exp-low)',
  moderate: 'var(--pv-exp-moderate)',
  high: 'var(--pv-exp-high)',
  unknown: 'var(--pv-exp-unknown)',
};
