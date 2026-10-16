import { cn } from '@/lib/utils';

/**
 * Shared container for the Info and Forecast pages (non-Home, non-map,
 * non-chat routes): centered max-width column with side gutters, top offset
 * for the fixed desktop navbar (+16px gap) and bottom offset for the mobile
 * tab bar. Section spacing uses --section-gap, and horizontal padding follows
 * the same --page-gutter-x used by Home and other routes.
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
        'w-full px-[var(--page-gutter-x)] pb-[calc(var(--mobile-tabbar-h)+env(safe-area-inset-bottom)+16px)] pt-[calc(var(--topbar-h)+16px)] lg:pb-16',
        className,
      )}
    >
      <div className="mx-auto w-full max-w-[84rem] space-y-[var(--section-gap)] [--section-gap:20px]">
        {children}
      </div>
    </div>
  );
}
