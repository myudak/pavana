import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export type FitMode = 'fit' | 'wrap' | 'left';

const LG_QUERY = '(min-width: 1024px)';

/**
 * Fit a single line of copy to its column width (desktop hero subtext).
 *
 * Measures the unwrapped text at `max` (rem), scales down toward `min`, and
 * reports how it landed so the caller can pick nowrap + justify (`fit`), a
 * capped 2-line wrap (`wrap`), or plain left alignment (`left`). Only the
 * element's own inline styles are written, so every breakpoint's classes stay
 * untouched — and below lg the hook stays idle, leaving mobile/tablet exactly
 * as styled.
 *
 * Re-fits when the text (MutationObserver) or the column width (parent
 * ResizeObserver, media change, font load) changes. Measuring always starts
 * from the unwrapped state, so passes are idempotent and never oscillate.
 */
export function useFitText<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { min, max }: { min: number; max: number },
): FitMode {
  const [mode, setMode] = useState<FitMode>('fit');

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    const mq = window.matchMedia(LG_QUERY);
    const parent = el.parentElement;
    let raf = 0;
    let disposed = false;

    const set = (next: FitMode) => setMode((prev) => (prev === next ? prev : next));

    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (disposed || el.clientWidth <= 0) return;
        if (!mq.matches) {
          el.style.fontSize = '';
          el.style.whiteSpace = '';
          set('left');
          return;
        }
        el.style.whiteSpace = 'nowrap';
        el.style.fontSize = `${max}rem`;
        const full = el.scrollWidth;
        const avail = el.clientWidth;
        if (full <= avail) {
          set('left');
          return;
        }
        const scaled = (max * avail) / full;
        if (scaled <= min) {
          el.style.fontSize = `${min}rem`;
          el.style.whiteSpace = '';
          set(el.scrollWidth > el.clientWidth ? 'wrap' : 'fit');
          return;
        }
        el.style.fontSize = `${scaled}rem`;
        el.style.whiteSpace = '';
        set('fit');
      });
    };

    fit();
    const onMedia = () => fit();
    mq.addEventListener('change', onMedia);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    if (ro && parent) ro.observe(parent);
    const mo = new MutationObserver(fit);
    mo.observe(el, { characterData: true, childList: true, subtree: true });
    document.fonts?.ready.then(() => fit()).catch(() => {});
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      mq.removeEventListener('change', onMedia);
      ro?.disconnect();
      mo.disconnect();
    };
  }, [ref, min, max]);

  return mode;
}
