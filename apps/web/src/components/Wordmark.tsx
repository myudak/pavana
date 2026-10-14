import mark from '@pavana/brand/mark.svg?raw';
import { cn } from '@/lib/utils';

/** Wordmark = "pavana" in Outfit 500, tight tracking + the provisional wind-flow mark. */
export function Wordmark({
  className,
  showMark = true,
}: {
  className?: string;
  showMark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink', className)}>
      {showMark && (
        <span
          aria-hidden
          className="size-7 text-primary [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: mark }}
        />
      )}
      <span className="font-display text-2xl font-medium tracking-[-0.05em]">pavana</span>
    </span>
  );
}
