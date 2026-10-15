import { View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { nativeFonts } from '@pavana/brand/native';
import { pm25ToUsAqi, windFromToFlowBearing, bearingToCompass16 } from '@pavana/shared';
import { useConditions, useForecast, useInsights } from '../../lib/queries';
import { useSettings } from '../../lib/settings';
import { t } from '../../lib/copy';
import { formatNumber } from '../../lib/format';
import {
  Action,
  Card,
  Copy,
  DemoNotice,
  Page,
  QueryBoundary,
  SectionTitle,
  Source,
  StateBadge,
} from '../../components/ui';
import { HourlyForecast } from '../../components/Forecast';
import { Factors } from '../../components/Factors';
import { Icon } from '../../components/Icon';

export default function TodayScreen() {
  const { colors } = useSettings();
  const conditions = useConditions();
  const forecast = useForecast();
  const insights = useInsights();
  return (
    <Page>
      <QueryBoundary query={conditions}>
        {(data) => {
          const category = pm25ToUsAqi(data.airQuality.pm25UgM3)?.category ?? 'unknown';
          const timezone = data.location.timezone;
          const weather = data.weather;
          const windFrom = weather?.windDirectionFromDeg ?? null;
          return (
            <>
              <DemoNotice show={data.airQuality.provenance.isDemo} />
              <View style={{ gap: 8 }}>
                <Copy muted style={{ fontSize: 12 }}>
                  {data.location.name} · {data.location.admin2 ?? data.location.admin1}
                </Copy>
                <Copy heading style={{ fontSize: 32, lineHeight: 38, letterSpacing: -0.8 }}>
                  {t.trendHeadline[data.trend]}
                </Copy>
              </View>
              <LinearGradient
                colors={[colors.hero, colors.surface]}
                style={{
                  borderRadius: 30,
                  padding: 24,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Copy muted style={{ fontSize: 12 }}>
                    {t.today.currentTitle}
                  </Copy>
                  <StateBadge state={data.state} />
                </View>
                <View
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 18 }}
                >
                  <Copy heading style={{ fontSize: 76, lineHeight: 88, letterSpacing: -3 }}>
                    {formatNumber(data.airQuality.pm25UgM3, 1)}
                  </Copy>
                  <Copy muted>{t.today.unit}</Copy>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 5 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors[category],
                    }}
                  />
                  <Copy style={{ color: colors[category], fontFamily: nativeFonts.medium }}>
                    {t.aqCategory[category]}
                  </Copy>
                </View>
                {data.airQuality.aqi && (
                  <Copy muted style={{ fontSize: 11, marginTop: 6 }}>
                    {t.mobile.aqi} {data.airQuality.aqi.value} · {t.aqiIndicativeShort}
                  </Copy>
                )}
                {data.airQuality.pm25UgM3 === null && <Copy muted>{t.today.noData}</Copy>}
                <Source provenance={data.airQuality.provenance} timezone={timezone} />
              </LinearGradient>
              <Card>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Copy muted style={{ fontSize: 11 }}>
                      {t.mobile.temperature}
                    </Copy>
                    <Copy heading style={{ fontSize: 26, lineHeight: 32 }}>
                      {formatNumber(weather?.temperatureC, 1)}
                      {t.mobile.degreeUnit}
                    </Copy>
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Copy muted style={{ fontSize: 11 }}>
                      {t.mobile.humidity}
                    </Copy>
                    <Copy heading style={{ fontSize: 26, lineHeight: 32 }}>
                      {formatNumber(weather?.relativeHumidityPct)}
                      {t.mobile.humidityUnit}
                    </Copy>
                  </View>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    alignItems: 'center',
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingTop: 16,
                    marginTop: 16,
                  }}
                >
                  <View
                    style={{
                      transform: [
                        {
                          rotate: (windFrom === null ? 0 : windFromToFlowBearing(windFrom)) + 'deg',
                        },
                      ],
                    }}
                  >
                    <Icon
                      name={windFrom === null ? 'wind' : 'arrow'}
                      color={colors.primary}
                      size={26}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Copy heading>
                      {t.mobile.wind} · {formatNumber(weather?.windSpeedMs, 1)} {t.mobile.speedUnit}
                    </Copy>
                    <Copy muted style={{ fontSize: 11 }}>
                      {t.map.windFrom}{' '}
                      {windFrom === null ? t.aqCategory.unknown : bearingToCompass16(windFrom)}
                    </Copy>
                  </View>
                </View>
                {weather && <Source provenance={weather.provenance} timezone={timezone} />}
              </Card>
              <Card>
                <SectionTitle>{t.today.timelineTitle}</SectionTitle>
                <QueryBoundary query={forecast}>
                  {(value) => <HourlyForecast forecast={value} />}
                </QueryBoundary>
              </Card>
              <Card>
                <SectionTitle>{t.today.whyTitle}</SectionTitle>
                <QueryBoundary query={insights}>
                  {(value) => <Factors factors={value.factors} timezone={timezone} />}
                </QueryBoundary>
                <View style={{ marginTop: 18 }}>
                  <Action
                    label={t.today.whyMore}
                    icon="chart"
                    onPress={() => router.push('/insight')}
                    secondary
                  />
                </View>
              </Card>
              <Action
                label={t.mobile.refresh}
                icon="refresh"
                onPress={() => {
                  void conditions.refetch();
                  void forecast.refetch();
                  void insights.refetch();
                }}
                secondary
              />
              <Card>
                <Copy muted style={{ fontSize: 12 }}>
                  {t.today.actionsNote}
                </Copy>
                <View style={{ marginTop: 14 }}>
                  <Action
                    label={t.info.linksTitle}
                    icon="external"
                    onPress={() => router.push('/info')}
                    secondary
                  />
                </View>
              </Card>
            </>
          );
        }}
      </QueryBoundary>
    </Page>
  );
}
