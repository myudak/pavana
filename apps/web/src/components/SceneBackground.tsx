import dusk from '@pavana/brand/backgrounds/dusk.webp';
import dusk900 from '@pavana/brand/backgrounds/dusk-900.webp';
import haze from '@pavana/brand/backgrounds/haze.webp';
import haze900 from '@pavana/brand/backgrounds/haze-900.webp';
import { useDarkMode } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

/**
 * Full-bleed landscape behind the top of every screen (Dusk in dark mode, Haze in
 * light mode), fading into the canvas so cards below stay readable. Decorative only.
 */
export function SceneBackground({ tall = false }: { tall?: boolean }) {
  const dark = useDarkMode();
  const [src, small] = dark ? [dusk, dusk900] : [haze, haze900];
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden transition-[height] duration-500',
        tall ? 'h-[78vh] min-h-[520px]' : 'h-[46vh] min-h-[320px]',
      )}
    >
      <img
        src={src}
        srcSet={`${small} 900w, ${src} 1672w`}
        sizes="100vw"
        alt=""
        decoding="async"
        className="size-full animate-drift object-cover object-[60%_center] motion-reduce:animate-none"
      />
      {/* Scrim: keeps text legible at the top and melts into the canvas below. */}
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? 'linear-gradient(180deg, rgba(14,17,32,0.55) 0%, rgba(14,17,32,0.25) 30%, rgba(14,17,32,0.7) 70%, var(--pv-canvas) 100%)'
            : 'linear-gradient(180deg, rgba(245,241,235,0.15) 0%, rgba(245,241,235,0.05) 30%, rgba(245,241,235,0.75) 72%, var(--pv-canvas) 100%)',
        }}
      />
    </div>
  );
}
