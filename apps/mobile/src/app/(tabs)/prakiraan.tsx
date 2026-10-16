import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeFonts } from '@pavana/brand/native';
import {
  useInsights,
  useForecast,
  useExposure,
  useConditions,
  useWeatherReference,
} from '../../lib/queries';
import { t } from '../../lib/copy';
import { formatNumber, formatTime } from '../../lib/format';
import { useSettings } from '../../lib/settings';
import {
  Card,
  Copy,
  DemoNotice,
  Page,
  QueryBoundary,
  SectionTitle,
  Source,
} from '../../components/ui';
import { ForecastChart } from '../../components/Forecast';
import { Factors } from '../../components/Factors';
import { Notifications } from '../../components/Notifications';
import { WindArrow, kmh, exposureColor } from '../../components/Exposure';

export default function ForecastScreen() {
  const insights = useInsights(),
    forecast = useForecast(),
    exposure = useExposure(),
    conditions = useConditions();
  const { colors } = useSettings();
  const reference = useWeatherReference();
  const [tab, setTab] = useState<'air' | 'smoke' | 'weather'>('air');
  const [methodOpen, setMethodOpen] = useState(false);
  const tz = forecast.data?.location.timezone ?? 'Asia/Jakarta';
  return (
    <Page title={t.forecast.title}>
      {conditions.data && (
        <Card
          style={{
            borderColor:
              conditions.data.trend === 'worsening'
                ? colors.exposureModerate + '66'
                : colors.glassBorder,
          }}
        >
          <Copy heading style={{ fontSize: 15, color: colors.exposureModerate }}>
            {
              t.insights.alert[
                conditions.data.state === 'insufficient'
                  ? 'insufficientTitle'
                  : conditions.data.trend === 'worsening'
                    ? 'worseningTitle'
                    : conditions.data.trend === 'improving'
                      ? 'improvingTitle'
                      : conditions.data.trend === 'stable'
                        ? 'stableTitle'
                        : 'unknownTitle'
              ]
            }
          </Copy>
          <Source provenance={conditions.data.airQuality.provenance} timezone={tz} />
        </Card>
      )}
      <View
        style={{
          flexDirection: 'row',
          padding: 4,
          borderRadius: 26,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          backgroundColor: colors.glass,
        }}
      >
        {(['air', 'smoke', 'weather'] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 10,
              borderRadius: 22,
              backgroundColor: tab === value ? colors.primary : 'transparent',
            }}
          >
            <Copy
              style={{
                fontFamily: nativeFonts.medium,
                fontSize: 12,
                color: tab === value ? colors.onPrimary : colors.muted,
              }}
            >
              {t.forecast.tabs[value]}
            </Copy>
          </Pressable>
        ))}
      </View>
      {tab === 'air' && (
        <Card>
          <SectionTitle>
            {t.forecast.airTitle}{' '}
            <Copy muted style={{ fontSize: 11, textTransform: 'none' }}>
              ({t.today.unit})
            </Copy>
          </SectionTitle>
          <QueryBoundary query={forecast}>
            {(value) => <ForecastChart forecast={value} />}
          </QueryBoundary>
        </Card>
      )}
      {tab === 'smoke' && (
        <Card>
          <SectionTitle>{t.forecast.smokeTitle}</SectionTitle>
          <QueryBoundary query={exposure}>
            {(value) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {value.hours.map((h) => (
                    <View
                      key={h.validAt}
                      style={{
                        width: 48,
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: 155,
                        gap: 8,
                      }}
                    >
                      <Copy muted style={{ fontSize: 9 }}>
                        {t.exposure.level[h.level]}
                      </Copy>
                      <View
                        style={{
                          width: 22,
                          borderRadius: 10,
                          height:
                            h.level === 'unknown'
                              ? 6
                              : h.level === 'high'
                                ? 84
                                : h.level === 'moderate'
                                  ? 56
                                  : h.level === 'low'
                                    ? 28
                                    : 12,
                          backgroundColor: exposureColor(h.level, colors),
                        }}
                      />
                      <Copy muted style={{ fontSize: 9 }}>
                        {formatTime(h.validAt, tz)}
                      </Copy>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </QueryBoundary>
          <Copy muted style={{ fontSize: 10, marginTop: 16, lineHeight: 17 }}>
            {t.exposure.disclaimer}
          </Copy>
        </Card>
      )}
      {tab === 'weather' && (
        <Card>
          <SectionTitle>{t.forecast.weatherTitle}</SectionTitle>
          <QueryBoundary query={forecast}>
            {(value) => (
              <>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  {[
                    t.exposure.stepNow,
                    t.tiles.wind,
                    t.forecast.temperature,
                    t.forecast.humidity,
                  ].map((label) => (
                    <Copy key={label} muted style={{ flex: 1, fontSize: 10 }}>
                      {label}
                    </Copy>
                  ))}
                </View>
                {value.hours.slice(0, 24).map((h) => (
                  <View
                    key={h.validAt}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderTopWidth: 1,
                      borderTopColor: colors.glassBorder,
                      paddingVertical: 10,
                    }}
                  >
                    <Copy muted style={{ flex: 1, fontSize: 11 }}>
                      {formatTime(h.validAt, tz)}
                    </Copy>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <WindArrow from={h.weather?.windDirectionFromDeg ?? null} />
                      <Copy style={{ fontSize: 11 }}>
                        {formatNumber(kmh(h.weather?.windSpeedMs))}
                      </Copy>
                    </View>
                    <Copy style={{ flex: 1, fontSize: 11 }}>
                      {formatNumber(h.weather?.temperatureC)}°
                    </Copy>
                    <Copy style={{ flex: 1, fontSize: 11 }}>
                      {formatNumber(h.weather?.relativeHumidityPct)}%
                    </Copy>
                  </View>
                ))}
                <Copy muted style={{ fontSize: 10 }}>
                  {t.forecast.windLegend}
                </Copy>
              </>
            )}
          </QueryBoundary>
        </Card>
      )}
      {tab === 'weather' && reference.isEnabled && (
        <Card>
          <SectionTitle>{t.reference.title}</SectionTitle>
          <QueryBoundary query={reference}>
            {(value) => (
              <>
                <Copy muted style={{ fontSize: 12 }}>
                  {value.place ? t.reference.note(value.place) : t.reference.none}
                </Copy>
                {value.hours.slice(0, 8).map((h) => (
                  <View
                    key={h.validAt}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      gap: 8,
                      paddingVertical: 8,
                    }}
                  >
                    <Copy muted style={{ fontSize: 11 }}>
                      {formatTime(h.validAt, tz)}
                    </Copy>
                    <Copy style={{ fontSize: 11 }}>
                      {formatNumber(h.temperatureC)}° · {formatNumber(h.relativeHumidityPct)}% ·{' '}
                      {formatNumber(kmh(h.windSpeedMs))} {t.mobile.kmh}
                    </Copy>
                  </View>
                ))}
                {value.provenance && <Source provenance={value.provenance} timezone={tz} />}
              </>
            )}
          </QueryBoundary>
        </Card>
      )}
      <Notifications />
      <Card>
        <SectionTitle>{t.forecast.factorsTitle}</SectionTitle>
        <QueryBoundary query={insights}>
          {(value) => <Factors factors={value.factors} timezone={tz} />}
        </QueryBoundary>
      </Card>
      <Card>
        <Copy heading>{t.forecast.modelTitle}</Copy>
        <Copy style={{ fontSize: 10, color: colors.exposureModerate, marginVertical: 6 }}>
          {t.forecast.modelStatus}
        </Copy>
        <Copy muted style={{ fontSize: 12 }}>
          {t.forecast.modelBody}
        </Copy>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: methodOpen }}
          onPress={() => setMethodOpen(!methodOpen)}
          style={{ padding: 12, borderRadius: 16, backgroundColor: colors.subtle, marginTop: 16 }}
        >
          <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 12 }}>
            {t.insights.howTitle} {methodOpen ? '−' : '+'}
          </Copy>
        </Pressable>
        {methodOpen &&
          t.insights.howBody.map((p) => (
            <Copy key={p} muted style={{ fontSize: 12, marginTop: 12 }}>
              {p}
            </Copy>
          ))}
      </Card>
      <DemoNotice show={forecast.data?.state === 'demo'} />
    </Page>
  );
}
