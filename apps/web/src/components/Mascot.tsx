import calm from '@/assets/mascot/pavi-calm.webp';
import curious from '@/assets/mascot/pavi-curious.webp';
import happyJump from '@/assets/mascot/pavi-happy-jump.webp';
import hugCalm from '@/assets/mascot/pavi-hug-calm.webp';
import hugLeaves from '@/assets/mascot/pavi-hug-leaves.webp';
import idle from '@/assets/mascot/pavi-idle.webp';
import joy from '@/assets/mascot/pavi-joy.webp';
import look from '@/assets/mascot/pavi-look.webp';
import sleep from '@/assets/mascot/pavi-sleep.webp';
import surprised from '@/assets/mascot/pavi-surprised.webp';
import wave from '@/assets/mascot/pavi-wave.webp';
import wink from '@/assets/mascot/pavi-wink.webp';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Pavi's 12 poses, sliced from the sticker sheet by scripts/build-mascot.mjs. */
const POSES = {
  calm,
  curious,
  'happy-jump': happyJump,
  'hug-calm': hugCalm,
  'hug-leaves': hugLeaves,
  idle,
  joy,
  look,
  sleep,
  surprised,
  wave,
  wink,
} as const;

export type MascotPose = keyof typeof POSES;

export function Mascot({
  pose,
  size = 64,
  float = false,
  decorative = false,
  className,
}: {
  pose: MascotPose;
  /** Rendered width/height in CSS px. */
  size?: number;
  /** Gentle bobbing; disabled under prefers-reduced-motion. */
  float?: boolean;
  /** Hide from screen readers when a visible label already names Pavi. */
  decorative?: boolean;
  className?: string;
}) {
  const t = useCopy();
  return (
    <img
      src={POSES[pose]}
      width={size}
      height={size}
      alt={decorative ? '' : t.chat.mascotAlt}
      aria-hidden={decorative || undefined}
      draggable={false}
      className={cn(
        'pointer-events-none shrink-0 select-none object-contain',
        float && 'motion-safe:animate-[pv-float_3.2s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}
