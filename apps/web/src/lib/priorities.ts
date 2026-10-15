/**
 * Shared priority tiers — used by the notification panel and the Info dashboard
 * cards so both speak the same visual language.
 */
export type Priority = 'attention' | 'watch' | 'info';

export const PRIORITY_RANK: Record<Priority, number> = { attention: 0, watch: 1, info: 2 };
