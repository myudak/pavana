import backdrop1280 from '@/assets/backdrop/backdrop-1280.webp';
import backdrop2560 from '@/assets/backdrop/backdrop-2560.webp';
import { useDarkMode } from '@/lib/theme-context';

/**
 * Full-bleed backdrop behind the Today first screen.
 *
 * Dark theme (Dusk/Haze): production dusk photo
 * (`apps/web/src/assets/backdrop/`, derived from
 * `design/references/background-hd.webp` — 2560x1440, itself enhanced from
 * `design/references/background.jpeg`; sunset glow on the right,
 * dark pines on the left) with legibility scrims: left-to-right for the hero
 * text, bottom blend into `--pv-canvas`, thin top shade under the transparent
 * nav. The photo only mounts in dark mode (via `useDarkMode`), so
 * light-theme users never download it.
 *
 * Light theme (Ember/Mist): soft cream wash, same layout.
 */
export function DuskBackdrop({ className }: { className?: string }) {
  const dark = useDarkMode();
  return (
    <div aria-hidden className={className} style={{ backgroundColor: 'var(--pv-canvas)' }}>
      {/* Light theme: soft cream wash with a faint warm glow. Same layout, clean cards. */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            'radial-gradient(60% 45% at 78% 30%, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0) 70%), linear-gradient(180deg, #faf6ef 0%, #f5ece0 55%, var(--pv-canvas) 100%)',
        }}
      />

      {/* Dark theme: photo + scrims. */}
      {dark && (
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(min-width: 768px)" srcSet={backdrop2560} type="image/webp" />
          <img
            src={backdrop1280}
            alt=""
            aria-hidden
            width={1600}
            height={900}
            decoding="async"
            fetchPriority="high"
            className="h-full w-full object-cover [object-position:62%_42%] md:[object-position:58%_40%]"
          />
        </picture>
      )}

      {dark && (
        <>
          {/* Legibility: strong dark gradient on the left for the hero headline,
              fading out so the purple/pink dusk stays vivid center-right. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(6,9,24,0.86) 0%, rgba(6,9,24,0.68) 26%, rgba(6,9,24,0.38) 48%, rgba(6,9,24,0.12) 68%, rgba(6,9,24,0) 85%)',
            }}
          />
          {/* Thin top shade so the transparent nav stays readable. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(6,9,24,0.55) 0%, transparent 180px)',
            }}
          />
          {/* Bottom blend into the canvas below the hero — no seam. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 52%, color-mix(in srgb, var(--pv-canvas) 55%, transparent) 80%, var(--pv-canvas) 100%)',
            }}
          />
        </>
      )}
    </div>
  );
}
