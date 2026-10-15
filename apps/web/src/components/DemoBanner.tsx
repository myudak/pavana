import { TestTube01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/Icon';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Must be visible on every screen that shows fixture data. */
export function DemoBanner({ className }: { className?: string }) {
  const t = useCopy();
  return (
    <div
      role="note"
      className={cn(
        'glass flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
        className,
      )}
    >
      <Icon icon={TestTube01Icon} className="mt-px size-4 text-state-demo" />
      <p>
        <strong className="font-semibold text-foreground">{t.demoBanner}</strong>
        <span className="text-muted-foreground"> — {t.demoBannerDetail}</span>
      </p>
    </div>
  );
}

/** Compact pill for headers. */
export function DemoPill({ className }: { className?: string }) {
  const t = useCopy();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-state-demo/20 px-2 py-0.5 text-[11px] font-semibold text-state-demo ring-1 ring-state-demo/30',
        className,
      )}
    >
      <Icon icon={TestTube01Icon} className="size-3" strokeWidth={2.2} />
      {t.dataState.demo}
    </span>
  );
}
