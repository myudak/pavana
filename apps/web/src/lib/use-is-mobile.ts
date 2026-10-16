import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/**
 * True on small screens (< 768px). Used to skip rendering heavy below-fold
 * chunks (MapLibre preview, Recharts chart) on mobile instead of hiding them
 * with CSS — hidden components would still download and run.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
