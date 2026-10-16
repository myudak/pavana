/**
 * Info dashboard derivation — deterministic card priorities and the category
 * filter. No React, no fetch: everything here is unit-tested.
 */
import type { DataState, Trend } from '@pavana/shared';
import type { Priority } from '../../lib/priorities';

export type InfoCardId = 'pm25' | 'hotspots' | 'official' | 'data';

export interface InfoCardDescriptor {
  id: InfoCardId;
  priority: Priority;
}

export const INFO_FILTERS = ['all', 'pm25', 'hotspots', 'official', 'data'] as const;
export type InfoFilter = (typeof INFO_FILTERS)[number];

/**
 * Priority per card, from real data only:
 * - pm25 rises to attention when the forecast worsens;
 * - hotspots stay at watch while detections exist (never a fire confirmation),
 *   and drop to info when there are none;
 * - official links are informational;
 * - the status card is attention whenever data is late, missing or failed.
 */
export function deriveInfoCards(input: {
  trend: Trend;
  hotspotCount: number | null;
  linkCount: number;
  dataState: DataState;
}): InfoCardDescriptor[] {
  const pm25: Priority = input.trend === 'worsening' ? 'attention' : 'watch';
  const hotspots: Priority =
    input.hotspotCount !== null && input.hotspotCount > 0 ? 'watch' : 'info';
  const official: Priority = input.linkCount > 0 ? 'info' : 'watch';
  const data: Priority =
    input.dataState === 'stale' || input.dataState === 'insufficient' || input.dataState === 'error'
      ? 'attention'
      : 'info';
  return [
    { id: 'pm25', priority: pm25 },
    { id: 'hotspots', priority: hotspots },
    { id: 'official', priority: official },
    { id: 'data', priority: data },
  ];
}

export function filterInfoCards(
  cards: readonly InfoCardDescriptor[],
  filter: InfoFilter,
): InfoCardDescriptor[] {
  return filter === 'all' ? [...cards] : cards.filter((c) => c.id === filter);
}

/** True when the page should warn about the data instead of sounding reassuring. */
export function hasDataWarning(state: DataState): boolean {
  return state === 'stale' || state === 'insufficient' || state === 'error';
}
