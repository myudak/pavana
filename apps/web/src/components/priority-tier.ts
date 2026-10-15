import type { Priority } from '@/lib/priorities';

/** Tier styling shared by priority markers: icon chip, badge variant, card border. */
export const PRIORITY_TIER: Record<
  Priority,
  { icon: string; badge: 'warning' | 'default' | 'muted'; border: string }
> = {
  attention: {
    icon: 'bg-warning-soft text-warning-ink',
    badge: 'warning',
    border: 'border-warning/50',
  },
  watch: { icon: 'bg-primary-soft text-primary-strong', badge: 'default', border: 'border-border' },
  info: { icon: 'bg-surface text-ink-muted', badge: 'muted', border: 'border-border' },
};
