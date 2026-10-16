import type { ExposureLevel, UsAqiCategory } from '@pavana/shared';
import type { Copy } from '@/lib/i18n';
import type { Mood } from './mascot-mood';

/**
 * DEMO chat script — no LLM. Replies are fixed, and every number comes from the demo
 * scenario (fixtures/scenario-kubu-raya.json, as served by the API in demo mode for
 * the default location Sungai Raya at the scenario's reference hour, 07.00 WIB).
 * When the real backend lands, these tool names stay and the results come from the
 * API services instead (see docs/backlog.md).
 */
export const DEMO_FACTS = {
  location: 'Sungai Raya',
  pm25UgM3: 33.9,
  aqi: 97,
  category: 'moderate' satisfies UsAqiCategory,
  trend: 'worsening',
  peakUgM3: 159.9,
  peakAt: '19.00 WIB',
  windFromDeg: 134,
  windSpeedKmh: 10,
  hotspots: { considered: 103, upwind: 101, radiusKm: 300, windowHours: 48 },
  exposure: {
    level: 'high' satisfies ExposureLevel,
    elevated: '13.00–01.00 WIB',
    // Hourly potential from 07.00 WIB (now) for 24 h, as in /api/exposure.
    hours: [
      ...Array<ExposureLevel>(6).fill('moderate'),
      ...Array<ExposureLevel>(13).fill('high'),
      ...Array<ExposureLevel>(6).fill('moderate'),
    ],
  },
} as const;

export const TOOL_NAMES = [
  'cek_kualitas_udara',
  'cek_titik_panas',
  'cek_angin',
  'apakah_asap_sampai',
  'saran_kesehatan',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export type Intent = 'greeting' | 'air' | 'reach' | 'hotspots' | 'mask' | 'why' | 'fallback';

export type ScriptStep =
  | { type: 'text'; text: string }
  | { type: 'tool'; toolName: ToolName; args: Record<string, string>; result: unknown };

export interface ScriptedReply {
  intent: Intent;
  mood: Mood;
  steps: ScriptStep[];
}

const RULES: [Intent, RegExp][] = [
  ['reach', /asap.*(sampai|ke ?sini|datang|kena)|paparan/],
  ['mask', /masker|saran|aman|olahraga|keluar rumah|lari|anak/],
  ['why', /kenapa|mengapa|sebab|penyebab/],
  ['hotspots', /titik panas|hotspot|kebakaran|karhutla|\bapi\b/],
  ['air', /udara|pm ?2[.,]?5|aqi|kualitas|polusi|ispu/],
  ['greeting', /^(hai|halo|hi|hello|hey|pagi|siang|sore|malam|assalamualaikum)\b/],
];

/** Keyword intent matching for the demo; first rule wins, otherwise `fallback`. */
export function matchIntent(text: string): Intent {
  const q = text.toLowerCase().trim();
  return RULES.find(([, re]) => re.test(q))?.[0] ?? 'fallback';
}

const where = { lokasi: DEMO_FACTS.location };

const tool = {
  air: (): ScriptStep => ({
    type: 'tool',
    toolName: 'cek_kualitas_udara',
    args: where,
    result: {
      pm25UgM3: DEMO_FACTS.pm25UgM3,
      aqi: DEMO_FACTS.aqi,
      category: DEMO_FACTS.category,
      trend: DEMO_FACTS.trend,
      peakUgM3: DEMO_FACTS.peakUgM3,
      peakAt: DEMO_FACTS.peakAt,
    },
  }),
  hotspots: (): ScriptStep => ({
    type: 'tool',
    toolName: 'cek_titik_panas',
    args: { ...where, radius: `${DEMO_FACTS.hotspots.radiusKm} km` },
    result: { ...DEMO_FACTS.hotspots },
  }),
  wind: (): ScriptStep => ({
    type: 'tool',
    toolName: 'cek_angin',
    args: where,
    result: { fromDeg: DEMO_FACTS.windFromDeg, speedKmh: DEMO_FACTS.windSpeedKmh },
  }),
  reach: (): ScriptStep => ({
    type: 'tool',
    toolName: 'apakah_asap_sampai',
    args: { ...where, jam: '24' },
    result: {
      level: DEMO_FACTS.exposure.level,
      elevated: DEMO_FACTS.exposure.elevated,
      peakAt: DEMO_FACTS.peakAt,
      hours: [...DEMO_FACTS.exposure.hours],
    },
  }),
  advice: (actions: readonly string[]): ScriptStep => ({
    type: 'tool',
    toolName: 'saran_kesehatan',
    args: { ...where, kategori: DEMO_FACTS.category },
    result: { actions: [...actions] },
  }),
};

const say = (text: string): ScriptStep => ({ type: 'text', text });

export function scriptFor(intent: Intent, c: Copy['chat']): ScriptedReply {
  const r = c.replies;
  switch (intent) {
    case 'greeting':
      return { intent, mood: 'greeting', steps: [say(r.greeting)] };
    case 'air':
      return { intent, mood: 'moderate', steps: [say(r.air[0]), tool.air(), say(r.air[1])] };
    case 'reach':
      return {
        intent,
        mood: 'concerned',
        steps: [
          say(r.reach[0]),
          tool.wind(),
          tool.hotspots(),
          say(r.reach[1]),
          tool.reach(),
          say(r.reach[2]),
        ],
      };
    case 'hotspots':
      return {
        intent,
        mood: 'curious',
        steps: [say(r.hotspots[0]), tool.hotspots(), say(r.hotspots[1])],
      };
    case 'mask':
      return {
        intent,
        mood: 'advice',
        steps: [say(r.mask[0]), tool.air(), say(r.mask[1]), tool.advice(c.advice)],
      };
    case 'why':
      return {
        intent,
        mood: 'curious',
        steps: [say(r.why[0]), tool.wind(), tool.hotspots(), say(r.why[1])],
      };
    case 'fallback':
      return { intent, mood: 'unsure', steps: [say(r.fallback)] };
  }
}
