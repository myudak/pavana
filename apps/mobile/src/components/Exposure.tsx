import { useId, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import {
  windFromToFlowBearing,
  pm25ToUsAqi,
  type ConditionsResponse,
  type ExposureHour,
  type ExposureLevel,
  type ExposureResponse,
} from '@pavana/shared';
import { nativeFonts, type Palette } from '@pavana/brand/native';
import { t } from '../lib/copy';
import { formatNumber, formatTime } from '../lib/format';
import { useSettings } from '../lib/settings';
import { Copy, Card, SectionTitle } from './ui';
import { Icon } from './Icon';

export const exposureColor = (level: ExposureLevel, colors: Palette) =>
  level === 'moderate' ? colors.exposureModerate : colors[level];
export const compass = (deg: number) =>
  t.compass[Math.round((((deg % 360) + 360) % 360) / 45) % 8]!;
export const kmh = (speed: number | null | undefined) => (speed == null ? null : speed * 3.6);

export function WindArrow({ from, size = 16 }: { from: number | null; size?: number }) {
  const { colors } = useSettings();
  if (from === null) return <Copy muted>—</Copy>;
  return (
    <View style={{ transform: [{ rotate: windFromToFlowBearing(from) + 'deg' }] }}>
      <Icon name="arrow" size={size} color={colors.accent} />
    </View>
  );
}

export function Sparkline({
  values,
  width = 128,
  height = 64,
}: {
  values: (number | null)[];
  width?: number;
  height?: number;
}) {
  const { colors } = useSettings();
  const id = useId();
  const nums = values.filter((v): v is number => v !== null);
  if (!nums.length) return null;
  const min = Math.min(...nums),
    max = Math.max(...nums);
  const y = (v: number) =>
    height - 8 - (max === min ? 0.5 : (v - min) / (max - min)) * (height - 16);
  const x = (i: number) => 8 + (i / Math.max(values.length - 1, 1)) * (width - 16);
  const d = values
    .map((v, i) =>
      v === null ? '' : `${i > 0 && values[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`,
    )
    .join(' ');
  const lastIndex = values.findLastIndex((v) => v !== null);
  return (
    <Svg width={width} height={height} aria-hidden={true}>
      <Defs>
        <LinearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={colors.primary} />
          <Stop offset="1" stopColor={colors.accent} />
        </LinearGradient>
      </Defs>
      <Path
        d={d}
        stroke={`url(#${id})`}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={x(lastIndex)}
        cy={y(values[lastIndex]!)}
        r={7}
        fill={colors.accent}
        opacity={0.15}
      />
      <Circle cx={x(lastIndex)} cy={y(values[lastIndex]!)} r={4} fill={colors.accent} />
    </Svg>
  );
}

export function SmokeTimeline({ exposure }: { exposure: ExposureResponse }) {
  const { colors } = useSettings();
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(1);
  const hours = exposure.hours;
  const safeIndex = Math.min(index, hours.length - 1);
  const hour = hours[safeIndex];
  if (!hour) return <Copy muted>{t.mobile.noForecast}</Copy>;
  const pick = (x: number) =>
    setIndex(Math.min(hours.length - 1, Math.max(0, Math.round((x / width) * (hours.length - 1)))));
  const color = exposureColor(hour.level, colors);
  return (
    <Card>
      <SectionTitle>{t.exposure.timelineTitle}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: -4 }}>
        {[0, 3, 6, 12, 24]
          .filter((s) => s < hours.length)
          .map((s) => {
            const step = hours[s]!;
            const tint = exposureColor(step.level, colors);
            return (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: s === safeIndex }}
                accessibilityLabel={`${s === 0 ? t.exposure.stepNow : t.exposure.stepHours(s)} · ${t.exposure.level[step.level]}`}
                onPress={() => setIndex(s)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  gap: 7,
                  borderRadius: 17,
                  backgroundColor: s === safeIndex ? colors.glassBorder : 'transparent',
                }}
              >
                <Copy muted style={{ fontSize: 10, lineHeight: 15 }}>
                  {s === 0 ? t.exposure.stepNow : t.exposure.stepHours(s)}
                </Copy>
                <View style={{ padding: 3, borderRadius: 12, backgroundColor: tint + '44' }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tint }} />
                </View>
                <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 11, lineHeight: 16 }}>
                  {t.exposure.level[step.level]}
                </Copy>
              </Pressable>
            );
          })}
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t.exposure.timelineHint}
        accessibilityValue={{
          min: 0,
          max: hours.length - 1,
          now: safeIndex,
          text: formatTime(hour.validAt, exposure.location.timezone),
        }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          setIndex((i) =>
            Math.min(
              hours.length - 1,
              Math.max(0, i + (e.nativeEvent.actionName === 'increment' ? 1 : -1)),
            ),
          )
        }
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        style={{ height: 36, justifyContent: 'center', marginTop: 4 }}
      >
        <View
          pointerEvents="none"
          style={{ height: 5, borderRadius: 5, backgroundColor: colors.primarySoft }}
        >
          <View
            style={{
              height: 5,
              width: `${(safeIndex / Math.max(hours.length - 1, 1)) * 100}%`,
              borderRadius: 5,
              backgroundColor: colors.accent,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: `${(safeIndex / Math.max(hours.length - 1, 1)) * 100}%`,
              top: -5,
              marginLeft: -6,
              width: 15,
              height: 15,
              borderRadius: 8,
              backgroundColor: colors.ink,
              borderWidth: 2,
              borderColor: colors.primary,
            }}
          />
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Copy muted style={{ fontSize: 10 }}>
          {t.exposure.stepNow}
        </Copy>
        <Copy muted style={{ fontSize: 10 }}>
          {t.exposure.timelineHint}
        </Copy>
        <Copy muted style={{ fontSize: 10 }}>
          {t.exposure.stepHours(hours.length - 1)}
        </Copy>
      </View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: color + '20',
          borderRadius: 16,
          padding: 12,
          marginTop: 12,
          gap: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 10 }}>
            {formatTime(hour.validAt, exposure.location.timezone)}
          </Copy>
          <Copy heading style={{ fontSize: 17, color }}>
            {t.exposure.level[hour.level]}
          </Copy>
        </View>
        <View style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 10 }}>
            {t.home.pm25Label}
          </Copy>
          <Copy heading style={{ fontSize: 17 }}>
            {formatNumber(hour.pm25UgM3)}
            <Copy muted style={{ fontSize: 9 }}>
              {' '}
              {t.today.unit}
            </Copy>
          </Copy>
        </View>
        <View style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 10 }}>
            {t.tiles.wind}
          </Copy>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <WindArrow from={hour.windFromDeg} />
            <Copy heading style={{ fontSize: 17 }}>
              {formatNumber(kmh(hour.windSpeedMs))}
              <Copy muted style={{ fontSize: 9 }}>
                {' '}
                {t.mobile.kmh}
              </Copy>
            </Copy>
          </View>
        </View>
      </View>
      <Copy muted style={{ fontSize: 10, lineHeight: 16, marginTop: 12 }}>
        {t.exposure.disclaimer}
      </Copy>
    </Card>
  );
}

export function HourlyStrip({ hours, timezone }: { hours: ExposureHour[]; timezone: string }) {
  const { colors } = useSettings();
  const id = useId();
  const values = hours.map((h) => h.pm25UgM3),
    nums = values.filter((v): v is number => v !== null);
  if (!hours.length) return <Copy muted>{t.mobile.noForecast}</Copy>;
  const min = nums.length ? Math.min(...nums) : 0,
    max = nums.length ? Math.max(...nums) : 1;
  const y = (v: number) => 26 + (max === min ? 23 : (1 - (v - min) / (max - min)) * 46),
    x = (i: number) => i * 60 + 30;
  const d = values
    .map((v, i) =>
      v === null ? '' : `${i > 0 && values[i - 1] !== null ? 'L' : 'M'}${x(i)},${y(v)}`,
    )
    .join(' ');
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <Svg width={hours.length * 60} height={82} aria-hidden={true}>
            <Defs>
              <LinearGradient id={id} x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={colors.primary} />
                <Stop offset="1" stopColor={colors.accent} />
              </LinearGradient>
            </Defs>
            <Path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={2.5} />
            {values.map((v, i) =>
              v === null ? null : (
                <SvgText
                  key={i}
                  x={x(i)}
                  y={y(v) - 10}
                  textAnchor="middle"
                  fill={colors.ink}
                  fontSize={12}
                  fontFamily={nativeFonts.medium}
                >
                  {formatNumber(v)}
                </SvgText>
              ),
            )}
          </Svg>
          <View style={{ flexDirection: 'row' }}>
            {hours.map((h, i) => (
              <View
                key={h.validAt}
                accessible
                accessibilityLabel={`${formatTime(h.validAt, timezone)}, ${formatNumber(h.pm25UgM3)} ${t.today.unit}, ${t.exposure.level[h.level]}`}
                style={{ width: 60, alignItems: 'center', gap: 8 }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: exposureColor(h.level, colors),
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <WindArrow from={h.windFromDeg} size={12} />
                  <Copy muted style={{ fontSize: 10 }}>
                    {formatNumber(kmh(h.windSpeedMs))}
                  </Copy>
                </View>
                <Copy muted style={{ fontSize: 11 }}>
                  {i === 0 ? t.exposure.stepNow : formatTime(h.validAt, timezone)}
                </Copy>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <Copy muted style={{ fontSize: 10, marginTop: 12 }}>
        {t.home.pm25Label} {t.today.unit} · {t.tiles.wind} {t.mobile.kmh}
      </Copy>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
        {(['none', 'low', 'moderate', 'high'] as const).map((level) => (
          <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: exposureColor(level, colors),
              }}
            />
            <Copy muted style={{ fontSize: 9 }}>
              {t.exposure.level[level]}
            </Copy>
          </View>
        ))}
      </View>
    </>
  );
}

export function ConditionTiles({
  conditions: c,
  hour,
}: {
  conditions: ConditionsResponse;
  hour?: ExposureHour;
}) {
  const { colors } = useSettings();
  const w = c.weather;
  const from = w?.windDirectionFromDeg ?? null;
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Copy muted>{t.tiles.wind}</Copy>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Copy heading style={{ fontSize: 22, lineHeight: 30 }}>
              {from === null ? t.tiles.missing : t.tiles.windFrom(compass(from))}
            </Copy>
            <Copy muted style={{ fontSize: 11 }}>
              {from === null
                ? '—'
                : t.tiles.windTo(compass(windFromToFlowBearing(from)).toLowerCase())}
            </Copy>
            <Copy heading style={{ fontSize: 28, lineHeight: 36, marginTop: 8 }}>
              {formatNumber(kmh(w?.windSpeedMs))}
              <Copy muted> {t.mobile.kmh}</Copy>
            </Copy>
          </View>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Copy muted style={{ position: 'absolute', top: 4, fontSize: 10 }}>
              {t.compassShort.n}
            </Copy>
            <Copy muted style={{ position: 'absolute', right: 6, fontSize: 10 }}>
              {t.compassShort.e}
            </Copy>
            <Copy muted style={{ position: 'absolute', bottom: 4, fontSize: 10 }}>
              {t.compassShort.s}
            </Copy>
            <Copy muted style={{ position: 'absolute', left: 6, fontSize: 10 }}>
              {t.compassShort.w}
            </Copy>
            <WindArrow from={from} size={48} />
          </View>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 12 }}>
            {t.tiles.aqi}
          </Copy>
          <Copy
            heading
            style={{
              fontSize: 34,
              lineHeight: 44,
              color: colors[pm25ToUsAqi(c.airQuality.pm25UgM3)?.category ?? 'unknown'],
            }}
          >
            {formatNumber(c.airQuality.aqi?.value)}
          </Copy>
          <Copy muted style={{ fontSize: 10, lineHeight: 16 }}>
            {t.tiles.aqiNote}
          </Copy>
        </Card>
        <Card style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 12 }}>
            {t.tiles.humidity}
          </Copy>
          <Copy heading style={{ fontSize: 34, lineHeight: 44 }}>
            {formatNumber(w?.relativeHumidityPct)}
            <Copy muted> %</Copy>
          </Copy>
        </Card>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 12 }}>
            {t.tiles.temperature}
          </Copy>
          <Copy heading style={{ fontSize: 34, lineHeight: 44 }}>
            {formatNumber(w?.temperatureC)}°
          </Copy>
          <Copy muted style={{ fontSize: 10 }}>
            {t.tiles.rain}:{' '}
            {w?.precipitationMm === 0 ? t.tiles.rainNone : formatNumber(w?.precipitationMm)}
          </Copy>
        </Card>
        <Card style={{ flex: 1 }}>
          <Copy muted style={{ fontSize: 12 }}>
            {t.tiles.hotspots}
          </Copy>
          <Copy heading style={{ fontSize: 27, lineHeight: 44 }}>
            {formatNumber(hour?.upwind?.contributingCount)}
            <Copy muted> / {formatNumber(hour?.upwind?.consideredCount)}</Copy>
          </Copy>
          <Copy muted style={{ fontSize: 10, lineHeight: 16 }}>
            {t.tiles.hotspotsNote}
          </Copy>
        </Card>
      </View>
    </View>
  );
}
