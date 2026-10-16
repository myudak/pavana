import { TestTube01Icon } from '@hugeicons/core-free-icons';
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
