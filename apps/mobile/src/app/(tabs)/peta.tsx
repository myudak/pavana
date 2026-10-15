import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Hotspot } from '@pavana/shared';
import { useConditions, useHotspots, boundsAround } from '../../lib/queries';
import { useSettings } from '../../lib/settings';
import { t } from '../../lib/copy';
import { formatDateTime, formatNumber } from '../../lib/format';
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
import HotspotMap from '../../components/HotspotMap';
import { Icon } from '../../components/Icon';

export default function MapScreen() {
  const { location, colors } = useSettings();
  const hotspots = useHotspots();
  const conditions = useConditions();
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const timezone = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  return (
    <Page title={t.map.title}>
      <QueryBoundary query={hotspots}>
        {(data) => (
          <>
            <DemoNotice
              show={data.state === 'demo' || data.hotspots.some((h) => h.provenance.isDemo)}
            />
            <Copy muted style={{ fontSize: 12 }}>
              {t.map.hotspotDisclaimer}
            </Copy>
            <HotspotMap
              location={location}
              bbox={boundsAround(location)}
              hotspots={data.hotspots}
              onSelect={setSelected}
            />
            <Copy muted style={{ fontSize: 10 }}>
              {t.mobile.mapArea}
            </Copy>
            <Card>
              <SectionTitle>{t.map.count(data.hotspots.length)}</SectionTitle>
              <StateBadge state={data.state} />
              {!data.hotspots.length && (
                <Copy muted style={{ marginTop: 14 }}>
                  {t.mobile.noHotspots}
                </Copy>
              )}
              {data.hotspots.map((hotspot) => (
                <Pressable
                  key={hotspot.id}
                  accessibilityRole="button"
                  accessibilityLabel={t.mobile.hotspotDetail + ' ' + hotspot.id}
                  onPress={() => setSelected(hotspot)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 18,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.unhealthy_sensitive,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Copy heading>
                      {hotspot.satellite} · {hotspot.instrument}
                    </Copy>
                    <Copy muted style={{ fontSize: 11 }}>
                      {formatDateTime(hotspot.acquiredAt, timezone)}
                    </Copy>
                    <Copy muted style={{ fontSize: 10 }}>
                      {hotspot.lat.toFixed(3)}, {hotspot.lon.toFixed(3)}
                    </Copy>
                  </View>
                  <Icon name="chevron" color={colors.muted} size={18} />
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </QueryBoundary>
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View
          style={{ flex: 1, backgroundColor: colors.canvas + 'dd', justifyContent: 'flex-end' }}
        >
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: colors.surface,
              maxHeight: '85%',
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 26, gap: 15 }}>
              <SectionTitle>{t.mobile.hotspotDetail}</SectionTitle>
              {selected && (
                <>
                  <Copy heading>
                    {selected.satellite} · {selected.instrument}
                  </Copy>
                  <Copy muted>{t.map.hotspotDisclaimer}</Copy>
                  <Copy>
                    {t.map.acquired}: {formatDateTime(selected.acquiredAt, timezone)}
                  </Copy>
                  <Copy>
                    {selected.lat.toFixed(4)}, {selected.lon.toFixed(4)}
                  </Copy>
                  <Copy>
                    {t.map.frp}: {formatNumber(selected.frpMw, 1)} {t.mobile.powerUnit}
                  </Copy>
                  <Copy>
                    {t.map.confidence}:{' '}
                    {selected.confidence
                      ? t.mobile.confidence[selected.confidence]
                      : t.aqCategory.unknown}
                  </Copy>
                  <Source provenance={selected.provenance} timezone={timezone} />
                </>
              )}
              <Action
                label={t.mobile.close}
                icon="close"
                onPress={() => setSelected(null)}
                secondary
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </Page>
  );
}
