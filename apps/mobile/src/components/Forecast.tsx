import { ScrollView, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { pm25ToUsAqi, type ForecastResponse } from '@pavana/shared';
import { useSettings } from '../lib/settings';
import { formatNumber, formatTime } from '../lib/format';
import { t } from '../lib/copy';
import { lineSegments } from '../lib/chart';
import { Copy, Source } from './ui';
import { nativeFonts } from '@pavana/brand/native';

export function HourlyForecast({ forecast }: { forecast: ForecastResponse }) {
  const { colors } = useSettings();
  if (!forecast.hours.length) return <Copy muted>{t.mobile.noForecast}</Copy>;
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingVertical: 5 }}
      >
        {forecast.hours.map((hour) => {
          const category = pm25ToUsAqi(hour.airQuality.pm25UgM3)?.category ?? 'unknown';
          return (
            <View
              key={hour.validAt}
              style={{
                padding: 14,
                gap: 10,
                borderRadius: 20,
                backgroundColor: colors.surfaceMuted,
                width: 88,
                alignItems: 'center',
              }}
            >
              <Copy muted style={{ fontSize: 11 }}>
                {formatTime(hour.validAt, forecast.location.timezone)}
              </Copy>
              <View
                style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors[category] }}
              />
              <Copy heading style={{ fontSize: 24, lineHeight: 30 }}>
                {formatNumber(hour.airQuality.pm25UgM3)}
              </Copy>
              <Copy muted style={{ fontSize: 10, lineHeight: 14, textAlign: 'center' }}>
                {t.aqCategory[category]}
              </Copy>
            </View>
          );
        })}
      </ScrollView>
      <Copy muted style={{ marginTop: 10, fontSize: 10 }}>
        {t.mobile.forecastHint}
      </Copy>
      {forecast.hours[0] && (
        <Source
          provenance={forecast.hours[0].airQuality.provenance}
          timezone={forecast.location.timezone}
        />
      )}
    </>
  );
}

export function ForecastChart({ forecast }: { forecast: ForecastResponse }) {
  const { colors } = useSettings();
  const { segments, max, hasData } = lineSegments(
    forecast.hours.map((x) => x.airQuality.pm25UgM3),
    280,
    120,
  );
  if (!hasData) return <Copy muted>{t.mobile.noForecast}</Copy>;
  const first = forecast.hours[0];
  const last = forecast.hours.at(-1);
  return (
    <View accessible accessibilityLabel={t.insights.chartTitle}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ justifyContent: 'space-between', paddingBottom: 5 }}>
          <Copy muted style={{ fontSize: 10 }}>
            {formatNumber(max)}
          </Copy>
          <Copy muted style={{ fontSize: 10 }}>
            {formatNumber(0)}
          </Copy>
        </View>
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={150} viewBox="-5 -10 290 145">
            {[0, 60, 120].map((y) => (
              <Line
                key={y}
                x1={0}
                x2={280}
                y1={y}
                y2={y}
                stroke={colors.border}
                strokeDasharray="3 5"
              />
            ))}
            {segments.map((segment, index) => (
              <Path
                key={index}
                d={segment.map((p, i) => (i ? 'L' : 'M') + p.x + ' ' + p.y).join(' ')}
                stroke={colors.primary}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {segments.flat().map((point, index) => (
              <Circle key={index} cx={point.x} cy={point.y} r={2.5} fill={colors.primary} />
            ))}
          </Svg>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Copy muted style={{ fontSize: 10 }}>
          {first ? formatTime(first.validAt, forecast.location.timezone) : '—'}
        </Copy>
        <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 10 }}>{t.today.unit}</Copy>
        <Copy muted style={{ fontSize: 10 }}>
          {last ? formatTime(last.validAt, forecast.location.timezone) : '—'}
        </Copy>
      </View>
    </View>
  );
}
