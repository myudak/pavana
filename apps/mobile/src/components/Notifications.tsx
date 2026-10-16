import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { nativeFonts } from '@pavana/brand/native';
import {
  deriveNotifications,
  factorNumber,
  peakOf,
  type RecommendationRule,
} from '../../../web/src/features/insights/insight-derive';
import { useConditions, useInsights, useForecast } from '../lib/queries';
import { formatDateTime, formatNumber, formatTime } from '../lib/format';
import { useSettings } from '../lib/settings';
import { t } from '../lib/copy';
import { Card, Copy, QueryBoundary, SectionTitle } from './ui';
import { compass } from './Exposure';
import { Icon } from './Icon';

export function Notifications() {
  const conditions = useConditions(),
    insights = useInsights(),
    forecast = useForecast();
  const { colors } = useSettings();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <QueryBoundary query={conditions}>
      {(c) => {
        const f = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
        const count = factorNumber(f, 'consideredCount');
        const items = deriveNotifications({
          trend: c.trend,
          hotspotCount: count,
          windRelevant: (factorNumber(f, 'contributingCount') ?? 0) > 0,
          state: c.state,
        });
        const peak = peakOf(forecast.data?.hours ?? []),
          tz = c.location.timezone;
        const vars = {
          peakUgM3: formatNumber(peak?.pm25UgM3),
          peakAt: peak ? formatTime(peak.validAt, tz) : '—',
          hotspotCount: formatNumber(count),
          radiusKm: formatNumber(factorNumber(f, 'radiusKm')),
          windowHours: formatNumber(factorNumber(f, 'windowHours')),
          windFrom:
            c.weather?.windDirectionFromDeg == null ? '—' : compass(c.weather.windDirectionFromDeg),
          detectionAt: f?.provenance[0] ? formatDateTime(f.provenance[0].validAt, tz) : '—',
          updatedAt: formatDateTime(c.airQuality.provenance.validAt, tz),
        };
        const n = t.insights.notif;
        const title = {
          combined: n.combinedTitle,
          'pm25-rise': n.pm25RiseTitle,
          hotspots: n.hotspotTitle,
          official: n.officialTitle,
          'data-stale': n.staleTitle,
          'data-insufficient': n.insufficientTitle,
        };
        const body = {
          combined: n.combinedBody,
          'pm25-rise': n.pm25Body,
          hotspots: n.hotspotBody(formatNumber(count)),
          official: n.officialBody,
          'data-stale': n.staleBody,
          'data-insufficient': n.insufficientBody,
        };
        return (
          <Card>
            <SectionTitle>{n.title}</SectionTitle>
            <Copy muted style={{ fontSize: 12, marginBottom: 16 }}>
              {n.subtitle}
            </Copy>
            {items.map((item) => {
              const rule: RecommendationRule = t.insights.rec.rules[item.id];
              return (
                <View
                  key={item.id}
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: colors.glassBorder,
                    paddingVertical: 13,
                    gap: 7,
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Icon
                      name={item.id === 'official' ? 'external' : 'bell'}
                      color={
                        item.priority === 'attention' ? colors.exposureModerate : colors.accent
                      }
                      size={19}
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 13 }}>
                        {title[item.id]}
                      </Copy>
                      <Copy muted style={{ fontSize: 12 }}>
                        {body[item.id]}
                      </Copy>
                    </View>
                    <Copy style={{ fontSize: 9, color: colors.accent }}>
                      {n.priority[item.priority]}
                    </Copy>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: expanded === item.id }}
                    onPress={() => setExpanded(expanded === item.id ? null : item.id)}
                  >
                    <Copy style={{ fontSize: 11, color: colors.primary }}>
                      {t.insights.rec.open} ›
                    </Copy>
                  </Pressable>
                  {expanded === item.id && (
                    <View
                      style={{
                        backgroundColor: colors.subtle,
                        borderRadius: 14,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <Copy style={{ fontSize: 12 }}>{rule.trigger(vars)}</Copy>
                      <Copy muted style={{ fontSize: 12 }}>
                        {rule.reason(vars)}
                      </Copy>
                      {rule.actions.map((action) => (
                        <Copy key={action} style={{ fontSize: 12 }}>
                          • {action}
                        </Copy>
                      ))}
                      <Copy muted style={{ fontSize: 10, lineHeight: 17 }}>
                        {rule.limit}
                      </Copy>
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => router.push(item.id === 'hotspots' ? '/peta' : '/info')}
                      >
                        <Copy style={{ fontSize: 12, color: colors.accent }}>
                          {item.id === 'hotspots' ? t.insights.cards.seeMap : t.info.linksTitle} ›
                        </Copy>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
            <Copy muted style={{ fontSize: 10, lineHeight: 17, marginTop: 10 }}>
              {n.note}
            </Copy>
          </Card>
        );
      }}
    </QueryBoundary>
  );
}
