import { cn } from '@/lib/utils';

/**
 * Arrow pointing toward where the wind BLOWS (flow bearing, 0° = north/up).
 * Pass `windFromToFlowBearing(fromDeg)`, never the raw meteorological FROM angle.
 */
export function WindArrow({ toDeg, className }: { toDeg: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('size-4 shrink-0', className)}
      style={{ transform: `rotate(${toDeg}deg)` }}
    >
      <path d="M12 2.5 19 20l-7-4-7 4z" fill="currentColor" />
    </svg>
  );
}
