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
            className="h-full w-full object-cover [object-position:78%_50%] md:[object-position:72%_45%]"
          />
        </picture>
      )}

      {dark && (
        <>
          {/* Legibility: left-to-right for the hero text on the left. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, color-mix(in srgb, var(--pv-canvas) 78%, transparent) 0%, color-mix(in srgb, var(--pv-canvas) 45%, transparent) 38%, color-mix(in srgb, var(--pv-canvas) 15%, transparent) 65%, color-mix(in srgb, var(--pv-canvas) 5%, transparent) 100%)',
            }}
          />
          {/* Thin top shade so the transparent nav stays readable. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--pv-canvas) 60%, transparent) 0%, transparent 180px)',
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
