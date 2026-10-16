import * as React from 'react';
import { cn } from '@/lib/utils';
import { getIndicatorLocalBounds } from './sliding-indicator-geometry';

/** Slides behind the selected item in a pill-shaped single-selection control. */
export function SlidingIndicator({
  selector,
  className,
}: {
  selector: string;
  className?: string;
}) {
  const indicatorRef = React.useRef<HTMLSpanElement>(null);

  React.useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const root = indicator?.parentElement;
    if (!indicator || !root) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = root.querySelector<HTMLElement>(selector);
        if (!active) {
          indicator.style.opacity = '0';
          return;
        }

        const rootRect = root.getBoundingClientRect();
        const activeRect = active.getBoundingClientRect();
        const rootStyle = getComputedStyle(root);
        const bounds = getIndicatorLocalBounds(rootRect, activeRect, {
          offsetWidth: root.offsetWidth,
          offsetHeight: root.offsetHeight,
          scrollLeft: root.scrollLeft,
          scrollTop: root.scrollTop,
          borderLeft: Number.parseFloat(rootStyle.borderLeftWidth) || 0,
          borderTop: Number.parseFloat(rootStyle.borderTopWidth) || 0,
        });
        indicator.style.width = `${bounds.width}px`;
        indicator.style.height = `${bounds.height}px`;
        indicator.style.transform = `translate3d(${bounds.left}px, ${bounds.top}px, 0)`;
        indicator.style.opacity = '1';
      });
    };

    const mutationObserver = new MutationObserver(update);
    mutationObserver.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state', 'aria-pressed'],
    });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(root);
    for (const item of root.children) resizeObserver.observe(item);

    root.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      root.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [selector]);

  return (
    <span
      ref={indicatorRef}
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute left-0 top-0 z-0 rounded-full opacity-0 transition-[transform,width,height,opacity] duration-300 ease-out motion-reduce:transition-none',
        className,
      )}
    />
  );
}
