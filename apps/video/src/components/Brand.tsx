import { Img, staticFile } from 'remotion';
import { color, font } from '../theme';

export type Pose =
  'wave' | 'joy' | 'surprised' | 'curious' | 'calm' | 'hug-leaves' | 'wink' | 'look';

/** Pavi, the app mascot (poses copied from apps/web/src/assets/mascot). */
export function Pavi({
  pose,
  size,
  style,
}: {
  pose: Pose;
  size: number;
  style?: React.CSSProperties;
}) {
  return (
    <Img
      src={staticFile(`pavi/pavi-${pose}.webp`)}
      style={{ width: size, height: size, objectFit: 'contain', ...style }}
    />
  );
}

export function Wordmark({ size }: { size: number }) {
  return (
    <span
      style={{
        fontFamily: font.wordmark,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: '-0.05em',
        color: color.cream,
        lineHeight: 1,
      }}
    >
      pavana
    </span>
  );
}

/** Small pill that marks app numbers as demo data. */
export function DemoBadge({ children }: { children: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 20px',
        borderRadius: 999,
        background: 'rgba(167, 139, 250, 0.16)',
        border: '1.5px solid rgba(167, 139, 250, 0.45)',
        color: '#c4b5fd',
        fontFamily: font.heading,
        fontWeight: 700,
        fontSize: 22,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 99, background: '#a78bfa' }} />
      {children}
    </span>
  );
}
