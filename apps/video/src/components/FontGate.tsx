import '@pavana/brand/fonts.css';
import { useEffect, useState, type ReactNode } from 'react';
import { continueRender, delayRender } from 'remotion';

const FACES = [
  '600 48px "Plus Jakarta Sans Variable"',
  '800 48px "Plus Jakarta Sans Variable"',
  '700 48px "Outfit Variable"',
  '700 48px "Comfortaa Variable"',
];

/** Holds rendering until the brand fonts are loaded, so no frame uses a fallback font. */
export function FontGate({ children }: { children: ReactNode }) {
  const [handle] = useState(() => delayRender('Loading brand fonts'));
  useEffect(() => {
    Promise.all(FACES.map((f) => document.fonts.load(f))).then(
      () => continueRender(handle),
      () => continueRender(handle),
    );
  }, [handle]);
  return <>{children}</>;
}
