import { describe, expect, it } from 'vitest';
import scenario from '../../../../../fixtures/scenario-kubu-raya.json';
import { id } from '@/lib/i18n/id';
import { DEMO_FACTS, matchIntent, scriptFor, TOOL_NAMES, type Intent } from './demo-script';
import { isMood, moodPose } from './mascot-mood';

describe('matchIntent', () => {
  it.each<[string, Intent]>([
    ['Apakah asap akan sampai ke sini?', 'reach'],
    ['Kualitas udara sekarang?', 'air'],
    ['Ada titik panas di dekat sini?', 'hotspots'],
    ['Perlu pakai masker?', 'mask'],
    ['Kenapa udaranya begini?', 'why'],
    ['halo pavi', 'greeting'],
    ['berapa harga cabai?', 'fallback'],
  ])('%s → %s', (text, intent) => {
    expect(matchIntent(text)).toBe(intent);
  });

  it('every suggestion chip maps to a scripted answer, not the fallback', () => {
    for (const s of id.chat.suggestions) expect(matchIntent(s)).not.toBe('fallback');
  });
});

describe('scriptFor', () => {
  const intents: Intent[] = ['greeting', 'air', 'reach', 'hotspots', 'mask', 'why', 'fallback'];

  it('only uses known tools and a valid mood', () => {
    for (const intent of intents) {
      const reply = scriptFor(intent, id.chat);
      expect(isMood(reply.mood)).toBe(true);
      expect(reply.steps.length).toBeGreaterThan(0);
      for (const step of reply.steps) {
        if (step.type === 'tool') expect(TOOL_NAMES).toContain(step.toolName);
        else expect(step.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows hotspots as detections, never as confirmed fires', () => {
    const tools = scriptFor('hotspots', id.chat).steps.filter((s) => s.type === 'tool');
    expect(tools.map((s) => s.toolName)).toEqual(['cek_titik_panas']);
    expect(id.chat.tools.hotspotNote).toMatch(/bukan kebakaran/);
  });
});

describe('DEMO_FACTS match the demo fixture (no invented numbers)', () => {
  const now = scenario.hours[0]!;
  const peak = scenario.hours
    .slice(0, 25)
    .reduce((a, b) => ((b.airQuality.pm25UgM3 ?? 0) > (a.airQuality.pm25UgM3 ?? 0) ? b : a));

  it('current PM2.5 and wind', () => {
    expect(DEMO_FACTS.pm25UgM3).toBe(now.airQuality.pm25UgM3);
    expect(DEMO_FACTS.windFromDeg).toBe(now.weather.windDirectionFromDeg);
    expect(DEMO_FACTS.windSpeedKmh).toBe(Math.round((now.weather.windSpeedMs ?? 0) * 3.6));
  });

  it('peak PM2.5 is the 24 h maximum at 19.00 WIB', () => {
    expect(DEMO_FACTS.peakUgM3).toBe(peak.airQuality.pm25UgM3);
    expect(peak.validAt).toBe('2026-09-15T12:00:00Z'); // 19.00 WIB (UTC+7)
  });

  it('exposure strip covers 25 hourly steps', () => {
    expect(DEMO_FACTS.exposure.hours).toHaveLength(25);
  });
});

describe('moodPose', () => {
  it('maps concern to the surprised pose and greeting to wave', () => {
    expect(moodPose('concerned')).toBe('surprised');
    expect(moodPose('greeting')).toBe('wave');
    expect(isMood('nope')).toBe(false);
  });
});
