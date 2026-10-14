import type { DataState } from '@pavana/shared';
import { Badge } from '@/components/ui/badge';
import { useCopy } from '@/lib/i18n';

const VARIANT = {
  live: 'default',
  stale: 'stale',
  insufficient: 'muted',
  demo: 'demo',
  error: 'error',
} as const satisfies Record<DataState, string>;

export function DataStateBadge({ state }: { state: DataState }) {
  const t = useCopy();
  return <Badge variant={VARIANT[state]}>{t.dataState[state]}</Badge>;
}
