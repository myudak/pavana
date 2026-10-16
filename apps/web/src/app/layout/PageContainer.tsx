import { cn } from '@/lib/utils';

/**
 * Shared container for the Info and Forecast pages (non-Home, non-map,
 * non-chat routes): centered max-width column with side gutters, top offset
 * for the fixed desktop navbar (+16px gap) and bottom offset for the mobile
 * tab bar. Section spacing uses --section-gap. Home, map and chat keep
 * their own layouts.
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[84rem] space-y-[var(--section-gap)] px-[6.25vw] pb-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom)+16px)] pt-[calc(var(--topbar-h)+16px)] [--section-gap:20px] lg:pb-16',
        className,
      )}
    >
      {children}
    </div>
  );
}
