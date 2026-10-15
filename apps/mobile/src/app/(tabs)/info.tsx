import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { nativeFonts } from '@pavana/brand/native';
import {
  useOfficialLinks,
  useConditions,
  useInsights,
  useForecast,
  useSources,
} from '../../lib/queries';
import {
  deriveInfoCards,
  filterInfoCards,
  INFO_FILTERS,
  type InfoFilter,
} from '../../../../web/src/features/info/info-derive';
import { factorNumber, peakOf } from '../../../../web/src/features/insights/insight-derive';
import { formatNumber, formatTime } from '../../lib/format';
import { useSettings, type ThemePref, type DataMode } from '../../lib/settings';
import { apiConfigured } from '../../lib/api';
import { t } from '../../lib/copy';
import {
  Card,
  Copy,
  Page,
  QueryBoundary,
  SectionTitle,
  StateBadge,
  Source,
  Action,
} from '../../components/ui';
import { Icon } from '../../components/Icon';

export default function InfoScreen() {
  const links = useOfficialLinks();
  const conditions = useConditions(),
    insights = useInsights(),
    forecast = useForecast(),
    sources = useSources();
  const [filter, setFilter] = useState<InfoFilter>('all');
  const { colors, theme, setTheme, mode, setMode } = useSettings();
  const factor = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
  const count = factorNumber(factor, 'consideredCount');
  const cards = filterInfoCards(
    deriveInfoCards({
      trend: conditions.data?.trend ?? 'unknown',
      hotspotCount: count,
      linkCount: links.data?.links.length ?? 0,
      dataState: conditions.data?.state ?? 'insufficient',
    }),
    filter,
  );
  const peak = peakOf(forecast.data?.hours ?? []),
    tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  function open(url: string) {
    void Linking.openURL(url).catch(() => Alert.alert(t.common.errorTitle, t.mobile.openLinkError));
  }
  return (
    <Page title={t.info.title}>
      <Copy muted style={{ fontSize: 13, marginTop: -8 }}>
        {t.info.subtitle}
      </Copy>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {INFO_FILTERS.map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 22,
              backgroundColor: filter === f ? colors.primary : colors.glass,
            }}
          >
            <Copy style={{ fontSize: 12, color: filter === f ? colors.onPrimary : colors.muted }}>
              {t.info.filters[f]}
            </Copy>
          </Pressable>
        ))}
      </ScrollView>
      <QueryBoundary query={conditions}>
        {(c) => (
          <View style={{ gap: 12 }}>
            {cards.map((card) => (
              <Card key={card.id}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <Copy heading style={{ fontSize: 16, flex: 1 }}>
                    {card.id === 'pm25'
                      ? t.info.cards.pm25Title
                      : card.id === 'hotspots'
                        ? t.info.cards.hotspotTitle
                        : card.id === 'official'
                          ? t.info.cards.officialTitle
                          : t.info.cards.dataTitle}
                  </Copy>
                  <Copy
                    style={{
                      fontSize: 9,
                      color:
                        card.priority === 'attention' ? colors.exposureModerate : colors.accent,
                    }}
                  >
                    {t.insights.notif.priority[card.priority]}
                  </Copy>
                </View>
                <Copy muted style={{ fontSize: 12 }}>
                  {card.id === 'pm25'
                    ? peak
                      ? t.info.cards.pm25Body(
                          formatNumber(peak.pm25UgM3),
                          formatTime(peak.validAt, tz),
                        )
                      : t.info.cards.pm25Empty
                    : card.id === 'hotspots'
                      ? count === null
                        ? t.info.cards.hotspotUnknown
                        : t.info.cards.hotspotBody(
                            formatNumber(count),
                            formatNumber(factorNumber(factor, 'radiusKm')),
                            formatNumber(factorNumber(factor, 'windowHours')),
                          )
                      : card.id === 'official'
                        ? t.info.cards.officialBody(formatNumber(links.data?.links.length))
                        : t.dataState[c.state]}
                </Copy>
                {card.id === 'data' ? (
                  <>
                    <StateBadge state={c.state} />
                    <Source provenance={c.airQuality.provenance} timezone={tz} />
                    <Action
                      label={t.info.cards.dataAction}
                      icon="refresh"
                      secondary
                      onPress={() => {
                        void conditions.refetch();
                        void forecast.refetch();
                        void insights.refetch();
                        void sources.refetch();
                      }}
                    />
                  </>
                ) : card.id === 'hotspots' ? (
                  <>
                    <Copy muted style={{ fontSize: 10, marginTop: 8 }}>
                      {t.info.cards.hotspotCaveat}
                    </Copy>
                    <Action
                      label={t.info.cards.hotspotAction}
                      secondary
                      onPress={() => router.push('/peta')}
                    />
                  </>
                ) : card.id === 'pm25' ? (
                  <Action
                    label={t.info.cards.pm25Action}
                    secondary
                    onPress={() => router.push('/prakiraan')}
                  />
                ) : (
                  <Copy muted style={{ fontSize: 10, marginTop: 8 }}>
                    {t.info.cards.officialCaveat}
                  </Copy>
                )}
              </Card>
            ))}
          </View>
        )}
      </QueryBoundary>
      <Card>
        <SectionTitle>{t.info.theme}</SectionTitle>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
          {(['light', 'dark', 'system'] as ThemePref[]).map((pref) => (
            <Pressable
              key={pref}
              accessibilityRole="radio"
              accessibilityState={{ checked: pref === theme }}
              onPress={() => setTheme(pref)}
              style={{
                flex: 1,
                padding: 12,
                alignItems: 'center',
                borderRadius: 20,
                backgroundColor: pref === theme ? colors.primarySoft : colors.surfaceMuted,
              }}
            >
              <Copy style={{ fontSize: 12, color: pref === theme ? colors.primary : colors.muted }}>
                {t.info.themeOptions[pref]}
              </Copy>
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <SectionTitle>{t.mode.title}</SectionTitle>
        {(['demo', 'api'] as DataMode[]).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{
              checked: value === mode,
              disabled: value === 'api' && !apiConfigured,
            }}
            disabled={value === 'api' && !apiConfigured}
            onPress={() => setMode(value)}
            style={{
              borderWidth: 1,
              borderColor: value === mode ? colors.primary : colors.border,
              backgroundColor: value === mode ? colors.primarySoft : colors.surfaceMuted,
              borderRadius: 18,
              padding: 16,
              marginBottom: 10,
              gap: 5,
              opacity: value === 'api' && !apiConfigured ? 0.5 : 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Copy style={{ fontFamily: nativeFonts.medium, flex: 1 }}>
                {value === 'demo' ? t.mode.demo : t.mode.live}
              </Copy>
              {mode === value && <Icon name="check" color={colors.primary} size={17} />}
            </View>
            <Copy muted style={{ fontSize: 11 }}>
              {value === 'demo'
                ? t.mode.demoBody
                : apiConfigured
                  ? t.mode.liveBody
                  : t.mobile.backendUnavailable}
            </Copy>
          </Pressable>
        ))}
      </Card>
      <Card>
        <SectionTitle>{t.sources.title}</SectionTitle>
        <QueryBoundary query={sources}>
          {(data) => (
            <View style={{ gap: 16 }}>
              {data.sources.map((source) => (
                <View key={source.id} style={{ gap: 5 }}>
                  <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => open(source.url)}
                      style={{ flex: 1 }}
                    >
                      <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 13 }}>
                        {source.name} ↗
                      </Copy>
                    </Pressable>
                    <Copy
                      style={{
                        fontSize: 10,
                        color:
                          source.status === 'error'
                            ? colors.error
                            : source.status === 'fixture'
                              ? colors.demo
                              : colors.muted,
                      }}
                    >
                      {t.sources.status[source.status]}
                    </Copy>
                  </View>
                  <Copy muted style={{ fontSize: 12 }}>
                    {source.use}
                  </Copy>
                  <Copy muted style={{ fontSize: 10 }}>
                    {source.attribution}
                  </Copy>
                </View>
              ))}
            </View>
          )}
        </QueryBoundary>
      </Card>
      <Card>
        <SectionTitle>{t.alerts.title}</SectionTitle>
        <Copy muted style={{ fontSize: 12 }}>
          {t.mobile.nativeAlertsNote}
        </Copy>
        <Action
          label={t.alerts.seeForecast}
          icon="bell"
          secondary
          onPress={() => router.push('/notifikasi')}
        />
      </Card>
      <Card>
        <SectionTitle>{t.info.linksTitle}</SectionTitle>
        <QueryBoundary query={links}>
          {(data) => (
            <View>
              {data.links.map((link) => (
                <Pressable
                  key={link.id}
                  accessibilityRole="link"
                  onPress={() => open(link.url)}
                  style={{
                    paddingVertical: 15,
                    gap: 5,
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Copy style={{ fontFamily: nativeFonts.medium, flex: 1 }}>
                      {link.publisher}
                    </Copy>
                    <Icon name="external" color={colors.primary} size={18} />
                  </View>
                  <Copy>{link.title}</Copy>
                  <Copy muted style={{ fontSize: 11 }}>
                    {link.description}
                  </Copy>
                </Pressable>
              ))}
            </View>
          )}
        </QueryBoundary>
      </Card>
      <Card>
        <SectionTitle>{t.info.aboutTitle}</SectionTitle>
        <Copy muted>{t.info.aboutBody}</Copy>
        <Copy muted style={{ fontSize: 11, marginTop: 15 }}>
          {t.mobile.locationPrivacy}
        </Copy>
      </Card>
      <Copy muted style={{ fontSize: 10, textAlign: 'center' }}>
        {t.mobile.versionUpdated}
      </Copy>
    </Page>
  );
}
