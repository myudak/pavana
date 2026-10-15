import backdrop1280 from '@/assets/backdrop/backdrop-1280.webp';
import backdrop2560 from '@/assets/backdrop/backdrop-2560.webp';
import dawn1280 from '@/assets/backdrop/dawn-1280.webp';
import dawn2560 from '@/assets/backdrop/dawn-2560.webp';
import { useDarkMode } from '@/lib/theme-context';

/**
 * Full-bleed backdrop behind the Today first screen. Both themes use a photo from
 * `apps/web/src/assets/backdrop/`; only the active theme's file is mounted, so the
 * other one is never downloaded.
 *
 * Dark theme (Dusk/Haze): `backdrop-2560.webp` / `backdrop-1280.webp` — production dusk
 * photo (derived from `design/references/background-hd.webp`, 2560x1440, itself enhanced
 * from `design/references/background.jpeg`; sunset glow on the right, dark pines on the
 * left).
 *
 * Light theme (Ember/Mist): `dawn-2560.webp` / `dawn-1280.webp` — daytime photo, kept
 * pale because the hero text is dark. Replace either pair by overwriting the file with
 * the same name (see the README in that folder); each component below adds the scrims
 * that keep the hero readable.
 */
export function DuskBackdrop({ className }: { className?: string }) {
  const dark = useDarkMode();
  return (
    <div aria-hidden className={className} style={{ backgroundColor: 'var(--pv-canvas)' }}>
      {/* Light theme: base wash (also the colour the photo blends into) + photo. */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            'radial-gradient(60% 45% at 78% 30%, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0) 70%), linear-gradient(180deg, #faf6ef 0%, #f5ece0 55%, var(--pv-canvas) 100%)',
        }}
      />

      {!dark && (
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(min-width: 768px)" srcSet={dawn2560} type="image/webp" />
          <img
            src={dawn1280}
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

      {/* Light-theme legibility scrims (canvas-based, so dark hero text keeps its AA
          contrast over the sunrise photo). Measured worst case: 6.53:1 for the lead and
          4.78:1 for the sub on desktop, 6.56:1 / 4.81:1 on mobile. */}
      {!dark && (
        <>
          {/* Mobile: the text runs nearly full width, so add a flat wash first. */}
          <div
            className="absolute inset-0 md:hidden"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--pv-canvas) 62%, transparent)',
            }}
          />
          {/* Desktop: horizontal wash that fades out to the right of the text column. */}
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                'linear-gradient(90deg, color-mix(in srgb, var(--pv-canvas) 90%, transparent) 0%, color-mix(in srgb, var(--pv-canvas) 72%, transparent) 40%, color-mix(in srgb, var(--pv-canvas) 34%, transparent) 72%, transparent 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--pv-canvas) 55%, transparent) 0%, transparent 180px)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 45%, color-mix(in srgb, var(--pv-canvas) 60%, transparent) 82%, var(--pv-canvas) 100%)',
            }}
          />
        </>
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
