import { useEffect, useState } from 'react';
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

/**
 * Soft scrim behind the floating navbar once the page scrolls (non-Home,
 * non-map routes): fixed layer the height of the navbar + 16px, gradient
 * from background/80 fading out at the bottom, below the navbar (z-40) and
 * above content so scrolled content never collides with the nav pill.
 * The navbar itself stays transparent.
 */
export function ScrollScrim() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!scrolled) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[calc(var(--topbar-h)+1rem)] bg-gradient-to-b from-background/80 to-transparent [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
    />
  );
}
