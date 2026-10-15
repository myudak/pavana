import type { ReactNode } from 'react';
import { DawnHero } from '@/components/DawnHero';
import { DuskHero } from '@/components/DuskHero';
import { cn } from '@/lib/utils';

/**
 * Section shell with an atmospheric backdrop in BOTH themes:
 * - dark: the dusk illustration drifting behind a scrim;
 * - light: the matching dawn/haze illustration behind a surface veil, so text and
 *   chart lines keep AA contrast.
 * The backdrop also zooms slightly while the pointer is over the section, and the
 * drift/glow animations stop under prefers-reduced-motion. Decorative only.
 */
export function AtmosphereSection({
  children,
  className,
  labelledBy,
  id,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        'group/section relative isolate overflow-hidden rounded-card border border-border bg-surface p-4 shadow-sm md:p-5',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-transform duration-[1200ms] ease-out group-hover/section:scale-[1.03]"
      >
        <DuskHero className="absolute inset-0 hidden h-full w-full animate-[pv-drift_28s_ease-in-out_infinite_alternate] opacity-45 dark:block" />
        <DawnHero className="absolute inset-0 h-full w-full animate-[pv-drift_34s_ease-in-out_infinite_alternate] opacity-80 dark:hidden" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 hidden dark:block"
        style={{ background: 'var(--pv-hero-scrim)' }}
      />
      {/* Light-mode veil: artwork shows at the top, content sits on near-solid surface. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-surface/45 via-surface/70 to-surface dark:hidden"
      />
      {children}
    </section>
  );
}
