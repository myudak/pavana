// Video look: Dusk / Haze from packages/brand/src/tokens.css (dark), plus the amber of a
// smoke-filled sky. Remotion renders plain React, so the values are mirrored here.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const color = {
  night: '#0e1120',
  ink: '#eef0f4',
  inkMuted: '#c9c3b8',
  cream: '#f5f1eb',
  haze: '#f472b6',
  ember: '#f97316',
  amber: '#fbbf24',
  glass: 'rgba(14, 17, 32, 0.58)',
  glassBorder: 'rgba(245, 241, 235, 0.14)',
} as const;

export const font = {
  heading: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif",
  display: "'Outfit Variable', 'Outfit', system-ui, sans-serif",
  wordmark: "'Comfortaa Variable', 'Comfortaa', system-ui, sans-serif",
} as const;

/** Seconds → frames. */
export const s = (seconds: number) => Math.round(seconds * FPS);
