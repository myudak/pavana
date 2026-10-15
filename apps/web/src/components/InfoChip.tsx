import { Info } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Short chip with the full sentence available on hover and to screen readers —
 * keeps caveats on screen without turning the page into paragraphs.
 */
export function InfoChip({
  label,
  detail,
  className,
}: {
  label: string;
  detail: string;
  className?: string;
}) {
  return (
    <span
      title={detail}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.6875rem] text-ink-muted',
        className,
      )}
    >
      <Info className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      <span className="sr-only">— {detail}</span>
    </span>
  );
}
