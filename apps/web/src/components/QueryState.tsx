import { Alert02Icon } from '@hugeicons/core-free-icons';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiRequestError } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Standard loading / error rendering for a query. Children render only with data. */
export function QueryState<T>({
  query,
  children,
  inline = false,
  skeleton,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  /** Render borderless loading/error states (for embedding inside another card). */
  inline?: boolean;
  /** Placeholder shape while loading. */
  skeleton?: ReactNode;
}) {
  const t = useCopy();
  if (query.isPending) {
    return (
      <div aria-busy aria-label={t.common.loading}>
        {skeleton ?? <Skeleton className={cn('w-full rounded-2xl', inline ? 'h-10' : 'h-32')} />}
      </div>
    );
  }
  if (query.isError) {
    const err = query.error;
    const msg =
      err instanceof ApiRequestError && err.code === 'not_implemented'
        ? t.common.notImplemented
        : err.message;
    return (
      <div role="alert" className={cn('space-y-3 text-sm', !inline && 'glass rounded-3xl p-4')}>
        <p className="flex items-center gap-2 font-medium text-state-error">
          <Icon icon={Alert02Icon} className="size-4" /> {t.common.errorTitle}
        </p>
        <p className="text-muted-foreground">{msg}</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {t.common.retry}
        </Button>
      </div>
    );
  }
  return <>{children(query.data)}</>;
}
