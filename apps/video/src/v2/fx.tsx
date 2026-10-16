// Visual effects shared by the v2 scenes: embers, light-leak flash, film overlay, camera shake.
import { AbsoluteFill, interpolate, random, staticFile, useCurrentFrame } from 'remotion';
import { clamp } from './kit';

/** Glowing embers drifting upward (flicker + sway). */
export function Embers({
  count = 70,
  strength = 1,
  seed = 'e',
}: {
  count?: number;
  strength?: number;
  seed?: string;
}) {
  const frame = useCurrentFrame();
  const t = frame / 30;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => {
        const speed = 0.05 + random(`${seed}v${i}`) * 0.12;
        const y = 1 - ((random(`${seed}y${i}`) + t * speed) % 1.1);
        const x = random(`${seed}x${i}`) + Math.sin(t * (0.8 + random(`${seed}w${i}`)) + i) * 0.015;
        const size = 2 + random(`${seed}s${i}`) * 5;
        const flicker = 0.55 + 0.45 * Math.sin(t * (6 + random(`${seed}f${i}`) * 8) + i);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x * 1920,
              top: y * 1080,
              width: size,
              height: size,
              borderRadius: 99,
              background: i % 3 ? '#ffb347' : '#ff6a2b',
              boxShadow: `0 0 ${size * 3}px ${i % 3 ? '#ffb347' : '#ff6a2b'}`,
              opacity: strength * flicker * Math.min(1, y * 3),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** A warm light-leak flash centred on `at` (frames), lasting `len` frames. */
export function Flash({
  at,
  len = 18,
  color = '255,190,110',
}: {
  at: number;
  len?: number;
  color?: string;
}) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at - len / 2, at, at + len / 2], [0, 1, 0], clamp);
  if (o <= 0) return null;
  const x = interpolate(frame, [at - len / 2, at + len / 2], [-20, 120], clamp);
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'screen',
        opacity: o * 0.85,
        background: `radial-gradient(ellipse 60% 90% at ${x}% 40%, rgba(${color},0.9) 0%, rgba(${color},0.25) 35%, transparent 70%)`,
      }}
    />
  );
}

/** Film overlay for the whole video: grain tiles and a soft vignette (cheap to render). */
export function FilmOverlay() {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  return (
    <>
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity: 0.06,
          mixBlendMode: 'overlay',
          backgroundImage: `url(${staticFile(`fx/noise-${step % 4}.png`)})`,
          backgroundPosition: `${(step * 97) % 256}px ${(step * 53) % 256}px`,
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </>
  );
}

/** Camera shake offset that decays after `at` (frames). */
export function shake(frame: number, at: number, amp = 14, len = 14) {
  const k = interpolate(frame, [at, at + len], [1, 0], clamp);
  if (frame < at || k <= 0) return 'translate(0px, 0px)';
  return `translate(${Math.sin(frame * 2.7) * amp * k}px, ${Math.cos(frame * 3.3) * amp * k}px)`;
}
