import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Frosted scrim behind the floating top bar once the page scrolls: fixed layer
 * the height of the navbar + 16px, background/85 fading out at the bottom,
 * below the bar (z-40) and above content so scrolled content never collides
 * with the bar. The blur lives on this layer, so the whole bar — wordmark,
 * pill nav, header buttons — sits on frosted glass instead of only the pill.
 * Routes whose panes scroll on their own (map, chat) render their own chrome.
 */
export function ScrollScrim() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div
      aria-hidden
      data-testid="scroll-scrim"
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-30 hidden h-[calc(var(--topbar-h)+1rem)] bg-gradient-to-b from-background/85 to-transparent backdrop-blur-xl transition-opacity duration-200 [mask-image:linear-gradient(to_bottom,black_72%,transparent)] lg:block',
        scrolled ? 'opacity-100' : 'opacity-0',
      )}
    />
  );
}
