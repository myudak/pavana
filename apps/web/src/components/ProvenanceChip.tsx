import type { Provenance } from '@pavana/shared';
import { Info } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Compact provenance chip: provider + valid time visible, full sentence
 * (provider · kind · valid time) on hover and for screen readers. Every number
 * needs provenance, but a chip keeps the page readable.
 */
export function ProvenanceChip({
  provenance,
  timeZone,
  className,
}: {
  provenance: Provenance;
  timeZone: string;
  className?: string;
}) {
  const t = useCopy();
  const at = formatDateTime(provenance.validAt, timeZone);
  const detail = `${t.common.source}: ${provenance.provider} · ${t.provenanceKind[provenance.kind]} · ${t.common.validAt} ${at}`;

  return (
    <span
      title={detail}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[0.6875rem] text-ink-muted',
        className,
      )}
    >
      <Info className="size-3 shrink-0" aria-hidden />
      <span className="truncate">
        {provenance.provider} · {at}
      </span>
      <span className="sr-only">{detail}</span>
    </span>
  );
}
