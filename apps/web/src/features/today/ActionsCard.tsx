import type { UseQueryResult } from '@tanstack/react-query';
import type { ConditionsResponse } from '@pavana/shared';
import { Info } from 'lucide-react';
import { Link } from 'react-router';
import { QueryState } from '@/components/QueryState';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { categoryOf } from '@/lib/aq';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { actionIconFor } from './action-icons';

/** Max advice rows per card — beyond that, show the first three. */
const MAX_ROWS = 3;

/**
 * "Yang bisa dilakukan" — one icon row per advice string from existing data
 * only (`today.actions` + the per-category health advice, never invented).
 * Same panel treatment as the "Kenapa bisa berubah?" card; the rows spread
 * (flex-1 + justify-between) so the card fills its grid row with no gap left
 * at the bottom.
 */
export function ActionsCard({
  query,
  className,
}: {
  query: UseQueryResult<ConditionsResponse>;
  className?: string;
}) {
  const t = useCopy();
  return (
    <Card className={cn('flex h-full flex-col', className)}>
      <CardHeader className="mb-2">
        <CardTitle>{t.today.actionsTitle}</CardTitle>
      </CardHeader>
      <QueryState query={query}>
        {(c) => {
          const category = categoryOf(c.airQuality.pm25UgM3);
          const items = [
            ...t.today.actions,
            ...(category !== 'unknown' ? [t.today.healthAdvice[category]] : []),
          ].slice(0, MAX_ROWS);
          return (
            <>
              <ul className="flex flex-1 flex-col justify-between gap-2">
                {items.length === 0 ? (
                  <li className="flex min-h-[3.5rem] items-center gap-3 rounded-xl border border-border/60 bg-surface/50 p-2 text-ink-muted">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                      <Info className="size-5" aria-hidden />
                    </span>
                    <p className="min-w-0 flex-1 text-sm">{t.today.noActions}</p>
                  </li>
                ) : (
                  items.map((text) => {
                    const Icon = actionIconFor(text);
                    return (
                      <li
                        key={text}
                        className="flex min-h-[3.5rem] items-center gap-3 rounded-xl border border-border/60 bg-surface/50 p-2"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <p className="line-clamp-2 min-w-0 flex-1 text-sm text-ink">{text}</p>
                      </li>
                    );
                  })
                )}
              </ul>
              <p className="mt-2 flex items-center gap-2 text-[0.6875rem] text-ink-muted">
                <span className="min-w-0 flex-1 truncate">{t.today.actionsNote}</span>
                <Link to="/info" className="shrink-0 underline">
                  {t.info.linksTitle}
                </Link>
              </p>
            </>
          );
        }}
      </QueryState>
    </Card>
  );
}
