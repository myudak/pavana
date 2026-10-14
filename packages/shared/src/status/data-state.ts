import type { DataState } from '../schemas/data-state';

export interface DeriveDataStateInput {
  isDemo: boolean;
  /** Primary value(s) present? e.g. pm25 not null. */
  hasValue: boolean;
  /** Valid time of the most recent datum (ISO). */
  validAt: string | null;
  now: Date;
  /** Older than this → stale. */
  maxAgeMinutes: number;
}

/**
 * Single place that decides the data state. Order matters:
 * missing data first (never hide a gap behind a badge), then demo (fixtures are
 * never "live" or "stale"), then age.
 */
export function deriveDataState(input: DeriveDataStateInput): DataState {
  if (!input.hasValue || input.validAt === null) return 'insufficient';
  if (input.isDemo) return 'demo';
  const ageMs = input.now.getTime() - new Date(input.validAt).getTime();
  if (!Number.isFinite(ageMs)) return 'error';
  return ageMs > input.maxAgeMinutes * 60_000 ? 'stale' : 'live';
}
