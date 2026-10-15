import type { Provenance } from '@pavana/shared';
import { formatDateTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** "Sumber: provider · Prakiraan · berlaku 15 Sep 07.00 WIB" — every number needs one. */
export function ProvenanceNote({
  provenance,
  timeZone,
  className,
}: {
  provenance: Provenance;
  timeZone: string;
  className?: string;
}) {
  const t = useCopy();
  return (
    <p className={cn('text-xs text-ink-muted', className)}>
      {t.common.source}: {t.providerName[provenance.provider] ?? provenance.provider} ·{' '}
      {t.provenanceKind[provenance.kind]} · {t.common.validAt}{' '}
      {formatDateTime(provenance.validAt, timeZone)}
    </p>
  );
}
