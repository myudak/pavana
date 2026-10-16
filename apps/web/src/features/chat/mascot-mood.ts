import type { MascotPose } from '@/components/Mascot';

/** What Pavi is "feeling" for a reply; the UI turns it into a pose. */
export type Mood =
  | 'greeting'
  | 'thinking'
  | 'good'
  | 'moderate'
  | 'concerned'
  | 'advice'
  | 'curious'
  | 'unsure'
  | 'error'
  | 'done';

const POSE: Record<Mood, MascotPose> = {
  greeting: 'wave',
  thinking: 'calm',
  good: 'joy',
  moderate: 'idle',
  concerned: 'surprised',
  advice: 'hug-leaves',
  curious: 'curious',
  unsure: 'hug-calm',
  error: 'sleep',
  done: 'wink',
};

export function moodPose(mood: Mood): MascotPose {
  return POSE[mood];
}

export function isMood(value: unknown): value is Mood {
  return typeof value === 'string' && value in POSE;
}
