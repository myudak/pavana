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
export type BackdropTint = 'none' | 'low' | 'moderate' | 'high' | 'unknown';

/** Ambient wash opacity per exposure level (unknown renders no tint). */
const TINT_OPACITY: Record<BackdropTint, number> = {
  none: 0,
  low: 0.06,
  moderate: 0.12,
  high: 0.18,
  unknown: 0,
};

const TINT_COLOR: Record<BackdropTint, string> = {
  none: 'var(--pv-exp-none)',
  low: 'var(--pv-exp-low)',
  moderate: 'var(--pv-exp-moderate)',
  high: 'var(--pv-exp-high)',
  unknown: 'var(--pv-exp-unknown)',
};

export function DuskBackdrop({
  className,
  tint = 'none',
}: {
  className?: string;
  tint?: BackdropTint;
}) {
  const dark = useDarkMode();
  return (
    <div aria-hidden className={className}>
      {/* Sky strips behind the mobile header live inside each theme block
          below (only the active theme's photo is ever mounted). */}
      {/* Light theme: base wash (also the colour the photo blends into) + photo. */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background:
            'radial-gradient(60% 45% at 78% 30%, rgba(249,115,22,0.14) 0%, rgba(249,115,22,0) 70%), linear-gradient(180deg, #faf6ef 0%, #f5ece0 55%, var(--pv-canvas) 100%)',
        }}
      />

      {!dark && (
        <>
          {/* Mobile sky strip behind the header bar + top safe area: flipped
              copy of the photo's top edge, so the sky continues seamlessly
              behind the navbar. The main photo keeps its position. */}
          <div className="absolute inset-x-0 top-0 h-[calc(3.25rem+env(safe-area-inset-top))] overflow-hidden md:hidden">
            <img
              src={dawn1280}
              alt=""
              aria-hidden
              width={1600}
              height={900}
              decoding="async"
              className="block h-full w-full -scale-y-100 object-cover object-top"
            />
          </div>
          <picture className="absolute inset-x-0 top-[calc(3.25rem+env(safe-area-inset-top))] block [mask-image:linear-gradient(180deg,black_0%,black_70%,transparent_100%)] md:inset-0 md:[mask-image:none]">
            <source media="(min-width: 768px)" srcSet={dawn2560} type="image/webp" />
            <img
              src={dawn1280}
              alt=""
              aria-hidden
              width={1600}
              height={900}
              decoding="async"
              fetchPriority="high"
              className="block h-auto w-full md:h-full md:w-full md:object-cover md:[object-position:72%_45%] lg:[object-position:50%_var(--hero-photo-y,100%)]"
            />
          </picture>
        </>
      )}

      {/* Dark theme: photo + scrims. Mobile shows the whole mountain at exactly
          100% viewport width (no zoom, no side crop), top-anchored below the
          header bar + safe area; desktop keeps the full-bleed cover crop. */}
      {dark && (
        <>
          {/* Mobile sky strip behind the header bar + top safe area: flipped
              copy of the photo's top edge, so the sky continues seamlessly
              behind the navbar. The main photo keeps its position. */}
          <div className="absolute inset-x-0 top-0 h-[calc(3.25rem+env(safe-area-inset-top))] overflow-hidden md:hidden">
            <img
              src={backdrop1280}
              alt=""
              aria-hidden
              width={1600}
              height={900}
              decoding="async"
              className="block h-full w-full -scale-y-100 object-cover object-top"
            />
          </div>
          <picture className="absolute inset-x-0 top-[calc(3.25rem+env(safe-area-inset-top))] block [mask-image:linear-gradient(180deg,black_0%,black_70%,transparent_100%)] md:inset-0 md:[mask-image:none]">
            <source media="(min-width: 768px)" srcSet={backdrop2560} type="image/webp" />
            <img
              src={backdrop1280}
              alt=""
              aria-hidden
              width={1600}
              height={900}
              decoding="async"
              fetchPriority="high"
              className="block h-auto w-full md:h-full md:w-full md:object-cover md:[object-position:58%_40%] lg:[object-position:50%_var(--hero-photo-y,100%)]"
            />
          </picture>
        </>
      )}

      {/* Base fade (lg only): bottom ~25% of the section melts into the page
          canvas so the photo joins the content below with no edge. The photo
          itself stays full-bleed to y=0 behind the navbar. */}
      <div
        className="absolute inset-x-0 bottom-0 hidden h-[25%] lg:block"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, var(--pv-canvas) 100%)',
        }}
      />

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
          {/* Desktop: horizontal wash that fades out to the right of the text column.
              On lg it is masked to the hero-text zone so the picture gap stays clear. */}
          <div
            className="absolute inset-0 hidden md:block lg:[mask-image:linear-gradient(180deg,black_0,black_420px,transparent_640px)]"
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
            className="absolute inset-0 md:hidden"
            style={{
              background:
                'linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--pv-canvas) 60%, transparent) 82%, var(--pv-canvas) 100%)',
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                'linear-gradient(180deg, transparent 45%, color-mix(in srgb, var(--pv-canvas) 60%, transparent) 82%, var(--pv-canvas) 100%)',
            }}
          />
        </>
      )}

      {dark && (
        <>
          {/* Legibility gradient for the hero headline. Desktop only — on mobile
              the thin vertical scrim behind the text plus text-shadow is enough,
              keeping the ridge zone clear of dark scrims. */}
          <div
            className="absolute inset-0 hidden md:block lg:[mask-image:linear-gradient(180deg,black_0,black_420px,transparent_640px)]"
            style={{
              background:
                'linear-gradient(90deg, rgba(6,9,24,0.86) 0%, rgba(6,9,24,0.68) 26%, rgba(6,9,24,0.38) 48%, rgba(6,9,24,0.12) 68%, rgba(6,9,24,0) 85%)',
            }}
          />
          {/* Thin top shade so the transparent nav stays readable.
              Mobile keeps it light (0.25) so the gap photo stays clear;
              desktop keeps the original 0.55 shade. */}
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(6,9,24,0.25) 0%, transparent 140px)',
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background: 'linear-gradient(180deg, rgba(6,9,24,0.55) 0%, transparent 180px)',
            }}
          />
          {/* Mobile vertical scrim: thin, only behind the hero text (starts
              ~26% of section height), solid canvas at the very bottom.
              Desktop keeps the original 52% blend. */}
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, transparent 30%, rgba(6,9,24,0.32) 44%, rgba(6,9,24,0.58) 62%, color-mix(in srgb, var(--pv-canvas) 78%, transparent) 86%, var(--pv-canvas) 100%)',
            }}
          />
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                'linear-gradient(180deg, transparent 52%, color-mix(in srgb, var(--pv-canvas) 55%, transparent) 80%, var(--pv-canvas) 100%)',
            }}
          />
        </>
      )}
      {/* Ambient exposure tint: flat color wash only (no smoke imagery,
          no animation). Rendered above the photo, below the hero text. */}
      {TINT_OPACITY[tint] > 0 && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, color-mix(in srgb, ${TINT_COLOR[tint]} ${Math.round(TINT_OPACITY[tint] * 100)}%, transparent), transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}
