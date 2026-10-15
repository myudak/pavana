import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { pm25ToUsAqi } from '@pavana/shared';
import { nativeFonts } from '@pavana/brand/native';
import {
  useConditions,
  useExposure,
  useInsights,
  useHotspots,
  boundsAround,
} from '../../lib/queries';
import { useSettings } from '../../lib/settings';
import { t } from '../../lib/copy';
import { formatNumber, formatTime, tzAbbr } from '../../lib/format';
import {
  Action,
  Card,
  Copy,
  DemoNotice,
  Page,
  QueryBoundary,
  SectionTitle,
  Source,
} from '../../components/ui';
import { ConditionTiles, HourlyStrip, SmokeTimeline, Sparkline } from '../../components/Exposure';
import GradientHeading from '../../components/GradientHeading';
import { Factors } from '../../components/Factors';
import HotspotMap from '../../components/HotspotMap';

export default function TodayScreen() {
  const { colors, location } = useSettings();
  const conditions = useConditions(),
    exposure = useExposure(),
    insights = useInsights(),
    hotspots = useHotspots();
  const e = exposure.data;
  const peak = e?.summary.peakLevel ?? 'unknown';
  const peakHour = e?.hours.find((h) => h.validAt === e.summary.peakAt);
  return (
    <Page>
      <QueryBoundary query={conditions}>
        {(c) => {
          const category = pm25ToUsAqi(c.airQuality.pm25UgM3)?.category ?? 'unknown';
          const tz = c.location.timezone;
          return (
            <>
              <View style={{ gap: 8, marginBottom: 4 }}>
                <Copy style={{ fontSize: 13, fontFamily: nativeFonts.medium, opacity: 0.85 }}>
                  {t.exposure.eyebrow}
                </Copy>
                <GradientHeading>{t.exposure.headline[peak]}</GradientHeading>
                {e && peak !== 'unknown' && (
                  <Copy style={{ fontSize: 14, lineHeight: 23, opacity: 0.85 }}>
                    {e.summary.peakAt
                      ? t.exposure.peakAt(formatTime(e.summary.peakAt, tz) + ' ' + tzAbbr(tz)) +
                        '. '
                      : ''}
                    {peakHour ? t.exposure.driver[peakHour.driver] : ''}
                  </Copy>
                )}
                {e?.summary.hotspotsAvailable === false && (
                  <Copy muted style={{ fontSize: 11 }}>
                    {t.hotspotsUnavailable}
                  </Copy>
                )}
              </View>
              <Card>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Copy
                      muted
                      style={{
                        fontFamily: nativeFonts.medium,
                        fontSize: 10,
                        letterSpacing: 1.6,
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      {t.today.currentTitle}
                    </Copy>
                    {c.airQuality.pm25UgM3 === null ? (
                      <Copy muted>{t.today.noData}</Copy>
                    ) : (
                      <Copy heading style={{ fontSize: 58, lineHeight: 66, letterSpacing: -2 }}>
                        {formatNumber(c.airQuality.pm25UgM3)}
                        <Copy muted style={{ fontSize: 12 }}>
                          {' '}
                          {t.today.unit}
                        </Copy>
                      </Copy>
                    )}
                  </View>
                  {e && (
                    <Sparkline
                      values={e.hours.slice(0, 13).map((h) => h.pm25UgM3)}
                      width={122}
                      height={66}
                    />
                  )}
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 5,
                      alignItems: 'center',
                      backgroundColor: colors[category] + '22',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 20,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors[category],
                      }}
                    />
                    <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 12 }}>
                      {t.aqCategory[category]}
                    </Copy>
                  </View>
                  {c.airQuality.aqi && (
                    <Copy muted style={{ fontSize: 10 }}>
                      {t.tiles.aqi} {c.airQuality.aqi.value} · {t.aqiIndicativeShort}
                    </Copy>
                  )}
                </View>
                {category !== 'unknown' && (
                  <Copy muted style={{ fontSize: 13, lineHeight: 22, marginTop: 8 }}>
                    {t.today.heroDesc[category]}
                  </Copy>
                )}
                <Source provenance={c.airQuality.provenance} timezone={tz} />
                {c.station && (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: colors.subtle,
                      marginTop: 12,
                    }}
                  >
                    <Copy style={{ fontSize: 11 }}>
                      {t.station.line(
                        c.station.name,
                        formatNumber(c.station.airQuality.pm25UgM3),
                        formatNumber(c.station.distanceKm, 1),
                      )}
                    </Copy>
                    <Source provenance={c.station.airQuality.provenance} timezone={tz} />
                  </View>
                )}
              </Card>
              <QueryBoundary query={exposure}>
                {(value) => <SmokeTimeline exposure={value} />}
              </QueryBoundary>
              <Card>
                <SectionTitle>{t.home.hourlyTitle}</SectionTitle>
                <QueryBoundary query={exposure}>
                  {(value) => <HourlyStrip hours={value.hours} timezone={tz} />}
                </QueryBoundary>
              </Card>
              <ConditionTiles conditions={c} hour={e?.hours[0]} />
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <SectionTitle>{t.home.whyTitle}</SectionTitle>
                  <Pressable accessibilityRole="link" onPress={() => router.push('/prakiraan')}>
                    <Copy style={{ fontSize: 10, color: colors.primary }}>{t.home.whyCta} ›</Copy>
                  </Pressable>
                </View>
                <QueryBoundary query={insights}>
                  {(value) => <Factors factors={value.factors} timezone={tz} />}
                </QueryBoundary>
              </Card>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <SectionTitle>{t.home.mapTitle}</SectionTitle>
                  <Pressable accessibilityRole="link" onPress={() => router.push('/peta')}>
                    <Copy style={{ fontSize: 10, color: colors.primary }}>{t.home.mapCta} ›</Copy>
                  </Pressable>
                </View>
                <View style={{ height: 200, borderRadius: 16, overflow: 'hidden' }}>
                  <HotspotMap
                    location={location}
                    bbox={boundsAround(location)}
                    hotspots={hotspots.data?.hotspots ?? []}
                    onSelect={() => router.push('/peta')}
                    compact
                  />
                </View>
              </Card>
              <Card>
                <SectionTitle>{t.today.actionsTitle}</SectionTitle>
                {category !== 'unknown' && (
                  <Copy
                    style={{
                      fontFamily: nativeFonts.medium,
                      fontSize: 12,
                      backgroundColor: colors.subtle,
                      padding: 12,
                      borderRadius: 16,
                      marginBottom: 10,
                    }}
                  >
                    {t.today.healthAdvice[category]}
                  </Copy>
                )}
                {t.today.actions.map((item) => (
                  <Copy muted key={item} style={{ fontSize: 12, marginBottom: 8 }}>
                    {item}
                  </Copy>
                ))}
                <Copy muted style={{ fontSize: 10, lineHeight: 17 }}>
                  {t.today.actionsNote} {t.today.healthAdviceSource}
                </Copy>
                <Action
                  label={t.info.linksTitle}
                  onPress={() => router.push('/info')}
                  secondary
                  icon="external"
                />
              </Card>
              <DemoNotice show={c.state === 'demo'} />
            </>
          );
        }}
      </QueryBoundary>
    </Page>
  );
}
