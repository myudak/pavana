import type { DataState } from '@pavana/shared';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const CLASS: Record<DataState, string> = {
  live: 'bg-primary/15 text-primary-strong ring-primary/30',
  stale: 'bg-state-stale/15 text-state-stale ring-state-stale/30',
  insufficient: 'bg-muted text-muted-foreground ring-border',
  demo: 'bg-state-demo/20 text-state-demo ring-state-demo/30',
  error: 'bg-state-error/15 text-state-error ring-state-error/30',
};

export function DataStateBadge({ state, className }: { state: DataState; className?: string }) {
  const t = useCopy();
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
        CLASS[state],
        className,
      )}
    >
      {t.dataState[state]}
    </span>
  );
}
