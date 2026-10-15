import { View } from 'react-native';
import { bearingToCompass16, type Factor } from '@pavana/shared';
import { nativeFonts } from '@pavana/brand/native';
import { formatNumber, formatTime } from '../lib/format';
import { t } from '../lib/copy';
import { useSettings } from '../lib/settings';
import { Copy, Source } from './ui';
import { Icon, type IconName } from './Icon';

function describe(factor: Factor, timezone: string) {
  const m = factor.metrics;
  const num = (v: unknown, digits = 0) => formatNumber(typeof v === 'number' ? v : null, digits);
  if (factor.id === 'pm25_trend') {
    if (typeof m.currentUgM3 !== 'number') return t.factor.detail.missing;
    return t.factor.detail.pm25Trend(
      num(m.currentUgM3),
      num(m.peakUgM3),
      typeof m.peakAt === 'string' ? formatTime(m.peakAt, timezone) : null,
    );
  }
  if (factor.id === 'wind') {
    if (typeof m.directionFromDeg !== 'number' || typeof m.flowToDeg !== 'number')
      return t.factor.detail.missing;
    return t.factor.detail.wind(
      bearingToCompass16(m.directionFromDeg),
      num(m.directionFromDeg),
      num(m.speedMs, 1),
      bearingToCompass16(m.flowToDeg),
    );
  }
  if (m.score === null || m.score === undefined) return t.factor.detail.missing;
  if (m.consideredCount === 0)
    return t.factor.detail.upwindNone(num(m.radiusKm), num(m.windowHours));
  return t.factor.detail.upwind(
    num(m.contributingCount),
    num(m.consideredCount),
    num(m.radiusKm),
    num(m.score, 2),
  );
}
const icons: Record<Factor['id'], IconName> = {
  pm25_trend: 'chart',
  wind: 'wind',
  upwind_hotspots: 'map',
};
export function Factors({ factors, timezone }: { factors: Factor[]; timezone: string }) {
  const { colors } = useSettings();
  return (
    <View style={{ gap: 20 }}>
      {factors.map((factor) => (
        <View key={factor.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name={icons[factor.id]} color={colors.primary} size={21} />
            <Copy style={{ fontFamily: nativeFonts.medium, flex: 1 }}>
              {t.factor.title[factor.id]}
            </Copy>
          </View>
          <Copy muted style={{ fontSize: 11 }}>
            {t.factor.signal[factor.signal]}
          </Copy>
          <Copy style={{ fontSize: 12, lineHeight: 20 }}>{describe(factor, timezone)}</Copy>
          {factor.provenance[0] && <Source provenance={factor.provenance[0]} timezone={timezone} />}
        </View>
      ))}
    </View>
  );
}
