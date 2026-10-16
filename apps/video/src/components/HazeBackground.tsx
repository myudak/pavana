import { AbsoluteFill, random, staticFile, useCurrentFrame } from 'remotion';
import { FPS, HEIGHT, WIDTH } from '../theme';

// Slow-drifting smoke blobs over an amber sky (think Palangka Raya at noon), with floating
// ash and film grain. Purely procedural: no photos, so no licensing questions.
const BLOBS = [
  { x: 0.22, y: 0.78, r: 900, c: 'rgba(251, 191, 36, 0.55)', speed: 0.05, phase: 0 },
  { x: 0.78, y: 0.35, r: 820, c: 'rgba(249, 115, 22, 0.42)', speed: 0.04, phase: 1.7 },
  { x: 0.5, y: 1.05, r: 1200, c: 'rgba(234, 179, 8, 0.5)', speed: 0.03, phase: 3.1 },
  { x: 0.08, y: 0.15, r: 700, c: 'rgba(120, 53, 15, 0.65)', speed: 0.06, phase: 4.4 },
  { x: 0.95, y: 0.95, r: 760, c: 'rgba(146, 64, 14, 0.55)', speed: 0.05, phase: 5.2 },
];

const ASH = Array.from({ length: 46 }, (_, i) => ({
  x: random(`ash-x-${i}`),
  y: random(`ash-y-${i}`),
  size: 2 + random(`ash-s-${i}`) * 5,
  speed: 0.012 + random(`ash-v-${i}`) * 0.03,
  sway: random(`ash-w-${i}`) * Math.PI * 2,
  alpha: 0.25 + random(`ash-a-${i}`) * 0.45,
}));

export function HazeBackground() {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  return (
    <AbsoluteFill
      style={{ background: 'linear-gradient(180deg, #2a1606 0%, #6e3f0d 52%, #a8691a 100%)' }}
    >
      {BLOBS.map((b, i) => {
        const dx = Math.sin(t * b.speed * Math.PI * 2 + b.phase) * 90;
        const dy = Math.cos(t * b.speed * Math.PI * 2 + b.phase) * 50;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x * WIDTH + dx - b.r / 2,
              top: b.y * HEIGHT + dy - b.r / 2,
              width: b.r,
              height: b.r,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${b.c} 0%, transparent 72%)`,
            }}
          />
        );
      })}

      {ASH.map((a, i) => {
        const y = (((a.y - t * a.speed) % 1) + 1) % 1;
        const x = a.x + Math.sin(t * 0.6 + a.sway) * 0.01;
        return (
          <div
            key={`ash-${i}`}
            style={{
              position: 'absolute',
              left: x * WIDTH,
              top: y * HEIGHT,
              width: a.size,
              height: a.size,
              borderRadius: '50%',
              background: `rgba(245, 241, 235, ${a.alpha})`,
            }}
          />
        );
      })}

      <Grain />
      {/* Vignette keeps text readable at the edges. */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, transparent 35%, rgba(10, 6, 2, 0.72) 100%)',
        }}
      />
    </AbsoluteFill>
  );
}

/**
 * Film grain: pre-made 256 px noise tiles (public/fx/noise-*.png) swapped and shifted every
 * 2 frames. Much cheaper to render than an SVG turbulence filter at 1920×1080.
 */
export function Grain({ opacity = 0.09 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  return (
    <AbsoluteFill
      style={{
        opacity,
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
        backgroundImage: `url(${staticFile(`fx/noise-${step % 4}.png`)})`,
        backgroundPosition: `${(step * 97) % 256}px ${(step * 53) % 256}px`,
      }}
    />
  );
}
