import { useState } from 'react';
import { TestTube01Icon } from '@hugeicons/core-free-icons';
import { FlaskConical } from 'lucide-react';
import { Icon } from '@/components/Icon';
import { useDemoMode } from '@/lib/demo-mode';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Must be visible on every screen that shows fixture data. Offers a way back to live data. */
export function DemoBanner({ className }: { className?: string }) {
  const t = useCopy();
  const { demo, setDemo } = useDemoMode();
  return (
    <div
      role="note"
      className={cn(
        'glass flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
        className,
      )}
    >
      <Icon icon={TestTube01Icon} className="mt-px size-4 text-state-demo" />
      <p className="min-w-0 flex-1">
        <strong className="font-semibold text-foreground">{t.demoBanner}</strong>
        <span className="text-muted-foreground">, {t.demoBannerDetail}</span>
        {demo && (
          <button
            type="button"
            onClick={() => setDemo(false)}
            className="ml-1 font-semibold text-primary-strong underline underline-offset-2"
          >
            {t.mode.exitDemo}
          </button>
        )}
      </p>
    </div>
  );
}

/** Compact pill for headers. When the user turned demo on, tapping it returns to live data. */
export function DemoPill({ className }: { className?: string }) {
  const t = useCopy();
  const { demo, setDemo } = useDemoMode();
  const cls = cn(
    'inline-flex items-center gap-1 rounded-full bg-state-demo/20 px-2 py-0.5 text-[11px] font-semibold text-state-demo ring-1 ring-state-demo/30',
    className,
  );
  const body = (
    <>
      <Icon icon={TestTube01Icon} className="size-3" strokeWidth={2.2} />
      {t.dataState.demo}
    </>
  );
  return demo ? (
    <button type="button" className={cls} onClick={() => setDemo(false)} title={t.mode.exitDemo}>
      {body}
    </button>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/**
 * Demo status chip for the app header (all non-Home routes). Visible only in
 * demo mode. Tapping opens a small glass popover with the demo explanation
 * and the existing live-data action.
 */
export function DemoChip({ className }: { className?: string }) {
  const t = useCopy();
  const { demo, setDemo } = useDemoMode();
  const [open, setOpen] = useState(false);
  if (!demo) return null;
  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t.mode.demoChipLabel}
        title={t.mode.demoChipLabel}
        className="glass inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-state-demo ring-1 ring-state-demo/30"
      >
        <FlaskConical className="size-3" aria-hidden />
        {t.mode.demo}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={t.mode.demoPopTitle}
          className="glass absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl p-4 text-left shadow-xl"
        >
          <p className="text-sm font-semibold">{t.mode.demoPopTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.mode.demoPopBody}</p>
          <button
            type="button"
            onClick={() => {
              setDemo(false);
              setOpen(false);
            }}
            className="mt-3 inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground"
          >
            {t.mode.exitDemo}
          </button>
        </div>
      )}
    </span>
  );
}
