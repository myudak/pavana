import dusk from '@pavana/brand/backgrounds/dusk.webp';
import { Img } from 'remotion';
import type { CSSProperties, ReactNode } from 'react';
import { color, font } from '../../theme';

export const SCREEN_W = 460;
export const SCREEN_H = 960;

/** A phone in the app's Dusk/Haze look; children are the recreated screen (460×960). */
export function Phone({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 76,
        background: 'linear-gradient(160deg, #2b3152, #0b0d18 60%)',
        boxShadow: '0 50px 140px rgba(0,0,0,0.65), inset 0 0 0 2px rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: 62,
          overflow: 'hidden',
          background: color.night,
          fontFamily: font.heading,
          color: color.ink,
        }}
      >
        <Img
          src={dusk}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '55%',
            objectFit: 'cover',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(14,17,32,0.2) 0%, rgba(14,17,32,0.85) 50%, #0e1120 70%)',
          }}
        />
        <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      </div>
    </div>
  );
}

/** App top bar: wordmark, location chip and the demo pill. */
export function TopBar({ title }: { title?: string }) {
  return (
    <div style={{ padding: '26px 24px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: font.wordmark,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '-0.05em',
          }}
        >
          {title ?? 'pavana'}
        </span>
        <span
          style={{ width: 38, height: 38, borderRadius: 99, background: 'rgba(238,240,244,0.1)' }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 19,
        }}
      >
        <span>
          <b>Sungai Raya</b>
          <span style={{ color: '#9ca3af' }}>, Kubu Raya</span>
        </span>
        <span
          style={{
            padding: '4px 12px',
            borderRadius: 99,
            background: 'rgba(167,139,250,0.18)',
            color: '#c4b5fd',
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          Demo
        </span>
      </div>
    </div>
  );
}
