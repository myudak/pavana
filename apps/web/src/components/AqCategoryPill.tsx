import type { UsAqiCategory } from '@pavana/shared';
import { AQ_STYLE } from '@/lib/aq';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function AqCategoryPill({
  category,
  className,
}: {
  category: UsAqiCategory | 'unknown';
  className?: string;
}) {
  const t = useCopy();
  const s = AQ_STYLE[category];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-ink',
        s.soft,
        className,
      )}
    >
      <span className={cn('size-2.5 rounded-full', s.dot)} aria-hidden />
      {t.aqCategory[category]}
    </span>
  );
}
