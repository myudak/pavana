import type { Factor } from '@pavana/shared';
import { formatNumber, formatTime } from '@/lib/format';
import type { Copy } from '@/lib/i18n';
import { compassId, msToKmh } from '@/lib/wind';

const num = (v: unknown, digits = 0) => formatNumber(typeof v === 'number' ? v : null, digits);

/** Turn structured factor metrics into Indonesian text. No free-form/LLM prose. */
export function describeFactor(f: Factor, t: Copy, timeZone: string): string {
  const m = f.metrics;
  switch (f.id) {
    case 'pm25_trend':
      if (m.currentUgM3 === null) return t.factor.detail.missing;
      return t.factor.detail.pm25Trend(
        num(m.currentUgM3),
        num(m.peakUgM3),
        typeof m.peakAt === 'string' ? formatTime(m.peakAt, timeZone) : null,
      );
    case 'wind':
      if (typeof m.directionFromDeg !== 'number') return t.factor.detail.missing;
      return t.factor.detail.wind(
        compassId(m.directionFromDeg, t),
        num(m.directionFromDeg),
        typeof m.speedMs === 'number' ? num(msToKmh(m.speedMs)) : '—',
        compassId(Number(m.flowToDeg), t).toLowerCase(),
      );
    case 'upwind_hotspots':
      if (m.score === null) return t.factor.detail.missing;
      if (m.consideredCount === 0)
        return t.factor.detail.upwindNone(num(m.radiusKm), num(m.windowHours));
      return t.factor.detail.upwind(
        num(m.contributingCount),
        num(m.consideredCount),
        num(m.radiusKm),
        num(m.score, 2),
      );
  }
}
