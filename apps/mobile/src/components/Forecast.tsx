import { useId, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { ForecastResponse } from '@pavana/shared';
import { nativeFonts } from '@pavana/brand/native';
import { availableRanges, sliceRange } from '../../../web/src/features/insights/insight-derive';
import { useSettings } from '../lib/settings';
import { formatNumber, formatTime } from '../lib/format';
import { t } from '../lib/copy';
import { chartIndexAt, lineSegments } from '../lib/chart';
import { Copy, Source } from './ui';

export function ForecastChart({ forecast }: { forecast: ForecastResponse }) {
  const { colors } = useSettings();
  const id = useId();
  const [range, setRange] = useState(24),
    [selected, setSelected] = useState(0),
    [width, setWidth] = useState(1);
  const ranges = availableRanges(forecast.hours),
    hours = sliceRange(forecast.hours, range);
  const { segments, max, hasData } = lineSegments(
    hours.map((h) => h.airQuality.pm25UgM3),
    280,
    140,
  );
  const values = hours.map((h) => h.airQuality.pm25UgM3).filter((v): v is number => v !== null);
  const hour = hours[Math.min(selected, hours.length - 1)];
  if (!hasData || !hour) return <Copy muted>{t.insights.chart.empty}</Copy>;
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {ranges.map((r) => (
          <Pressable
            key={r}
            accessibilityRole="button"
            accessibilityState={{ selected: range === r }}
            onPress={() => {
              setRange(r);
              setSelected(0);
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 20,
              backgroundColor: range === r ? colors.primarySoft : colors.subtle,
            }}
          >
            <Copy style={{ fontSize: 11, color: range === r ? colors.primary : colors.muted }}>
              {t.insights.chart.ranges[r]}
            </Copy>
          </Pressable>
        ))}
        <Copy muted style={{ fontSize: 10 }}>
          {forecast.state === 'demo'
            ? t.insights.chart.illustrativeTag
            : t.insights.chart.dataType[hour.airQuality.provenance.kind]}
        </Copy>
      </View>
      <View
        style={{
          backgroundColor: colors.subtle,
          borderRadius: 14,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Copy muted style={{ fontSize: 11 }}>
          {formatTime(hour.validAt, forecast.location.timezone)}
        </Copy>
        <Copy heading style={{ fontSize: 22 }}>
          {formatNumber(hour.airQuality.pm25UgM3)}
          <Copy muted style={{ fontSize: 10 }}>
            {' '}
            {t.today.unit}
          </Copy>
        </Copy>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ justifyContent: 'space-between', paddingBottom: 12 }}>
          {[max, max / 2, 0].map((v) => (
            <Copy key={v} muted style={{ fontSize: 9 }}>
              {formatNumber(v)}
            </Copy>
          ))}
        </View>
        <Pressable
          style={{ flex: 1 }}
          accessibilityRole="adjustable"
          accessibilityLabel={t.insights.chart.srLabel(hours.length)}
          accessibilityValue={{
            min: 0,
            max: hours.length - 1,
            now: Math.min(selected, hours.length - 1),
            text: formatNumber(hour.airQuality.pm25UgM3),
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) =>
            setSelected((i) =>
              Math.min(
                hours.length - 1,
                Math.max(0, i + (e.nativeEvent.actionName === 'increment' ? 1 : -1)),
              ),
            )
          }
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onPress={(e) => {
            const position =
              e.nativeEvent.locationX ?? (e.nativeEvent as unknown as { offsetX?: number }).offsetX;
            const next = chartIndexAt(position, width, hours.length);
            if (next !== null) setSelected(next);
          }}
        >
          <Svg width="100%" height={175} viewBox="-4 -8 288 164" aria-hidden={true}>
            <Defs>
              <LinearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.accent} />
              </LinearGradient>
            </Defs>
            {[0, 70, 140].map((y) => (
              <Line
                key={y}
                x1={0}
                x2={280}
                y1={y}
                y2={y}
                stroke={colors.glassBorder}
                strokeDasharray="3 5"
              />
            ))}
            {segments.map((segment, i) => (
              <Path
                key={i}
                d={segment.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' ')}
                stroke={`url(#${id})`}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {hour.airQuality.pm25UgM3 !== null && (
              <>
                <Line
                  x1={(selected / Math.max(hours.length - 1, 1)) * 280}
                  x2={(selected / Math.max(hours.length - 1, 1)) * 280}
                  y1={0}
                  y2={140}
                  stroke={colors.muted}
                  strokeDasharray="3 4"
                />
                <Circle
                  cx={(selected / Math.max(hours.length - 1, 1)) * 280}
                  cy={140 - (hour.airQuality.pm25UgM3 / max) * 140}
                  r={5}
                  fill={colors.accent}
                />
              </>
            )}
          </Svg>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[hours[0], hours[Math.floor(hours.length / 2)], hours.at(-1)].map((h, i) => (
          <Copy key={i} muted style={{ fontSize: 10 }}>
            {h ? formatTime(h.validAt, forecast.location.timezone) : '—'}
          </Copy>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          [t.insights.chart.statsMin, Math.min(...values)],
          [t.insights.chart.statsAvg, values.reduce((a, b) => a + b, 0) / values.length],
          [t.insights.chart.statsPeak, Math.max(...values)],
        ].map(([label, value]) => (
          <View
            key={label}
            style={{
              flex: 1,
              backgroundColor: colors.subtle,
              borderRadius: 14,
              padding: 10,
              gap: 4,
            }}
          >
            <Copy muted style={{ fontSize: 10 }}>
              {label}
            </Copy>
            <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 18 }}>
              {formatNumber(value as number)}
            </Copy>
          </View>
        ))}
      </View>
      <Source provenance={hour.airQuality.provenance} timezone={forecast.location.timezone} />
    </View>
  );
}
