import {
  BellRing,
  HeartPulse,
  PersonStanding,
  ShieldCheck,
  Wind,
  type LucideIcon,
} from 'lucide-react';

/**
 * Keyword → icon rules for the "Yang bisa dilakukan" rows. First match wins;
 * unknown text falls back to ShieldCheck. Pure mapping — it never invents
 * advice, only decorates the existing strings.
 */
const RULES: Array<{ pattern: RegExp; icon: LucideIcon }> = [
  { pattern: /pantau|pembaruan/i, icon: BellRing },
  { pattern: /aktivitas|luar ruangan/i, icon: PersonStanding },
  { pattern: /sensitif|anak|lansia/i, icon: HeartPulse },
  { pattern: /jendela|ventilasi/i, icon: Wind },
  { pattern: /masker/i, icon: ShieldCheck },
];

export function actionIconFor(text: string): LucideIcon {
  return RULES.find(({ pattern }) => pattern.test(text))?.icon ?? ShieldCheck;
}
