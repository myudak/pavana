import type { UseQueryResult } from '@tanstack/react-query';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiRequestError } from '@/lib/api';
import { useCopy } from '@/lib/i18n';

/** Standard loading / error rendering for a query. Children render only with data. */
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  const t = useCopy();
  if (query.isPending) {
    return (
      <Card className="flex items-center gap-2 text-sm text-ink-muted" aria-busy>
        <Loader2 className="size-4 animate-spin" aria-hidden /> {t.common.loading}
      </Card>
    );
  }
  if (query.isError) {
    const err = query.error;
    const msg =
      err instanceof ApiRequestError && err.code === 'not_implemented'
        ? t.common.notImplemented
        : err.message;
    return (
      <Card role="alert" className="space-y-3">
        <p className="flex items-center gap-2 font-medium text-state-error">
          <AlertTriangle className="size-4" aria-hidden /> {t.common.errorTitle}
        </p>
        <p className="text-sm text-ink-muted">{msg}</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {t.common.retry}
        </Button>
      </Card>
    );
  }
  return <>{children(query.data)}</>;
}
