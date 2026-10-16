import type { DataState } from '@pavana/shared';
import { DataStateBadge } from '@/components/DataStateBadge';
import { useCopy } from '@/lib/i18n';

/** Page header: title, one-line purpose, and the page-level data-state badge. */
export function InsightHeader({ state }: { state: DataState }) {
  const t = useCopy();
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 pt-2">
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          {t.insights.title}
        </h1>
      </div>
      {state !== 'demo' && <DataStateBadge state={state} />}
    </header>
  );
}
