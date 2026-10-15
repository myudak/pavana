import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Hotspot } from '@pavana/shared';
import { nativeFonts } from '@pavana/brand/native';
import { useConditions, useHotspots, useRegionalHotspots, boundsAround } from '../../lib/queries';
import { useSettings } from '../../lib/settings';
import { t } from '../../lib/copy';
import { formatDateTime, formatNumber } from '../../lib/format';
import { Card, Copy, LocationLine, Source } from '../../components/ui';
import HotspotMap from '../../components/HotspotMap';
import { DEFAULT_LAYERS, type MapLayer } from '../../components/map-document';
import { WindArrow, compass, kmh } from '../../components/Exposure';
import { Icon } from '../../components/Icon';

export default function MapScreen() {
  const { location, colors, isDark, setTheme } = useSettings();
  const insets = useSafeAreaInsets();
  const local = useHotspots(),
    regional = useRegionalHotspots(),
    conditions = useConditions();
  const [selected, setSelected] = useState<Hotspot | null>(null),
    [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS),
    [region, setRegion] = useState(false),
    [hours, setHours] = useState(6);
  const shown = useMemo(
    () =>
      Array.from(
        new Map(
          [...(regional.data?.hotspots ?? []), ...(local.data?.hotspots ?? [])].map((h) => [
            h.id,
            h,
          ]),
        ).values(),
      ),
    [local.data, regional.data],
  );
  const w = conditions.data?.weather,
    tz = conditions.data?.location.timezone ?? 'Asia/Jakarta';
  const labels = {
    hotspots: t.map.layerHotspots,
    density: t.map.layerDensity,
    wind: t.map.layerWind,
    plumes: t.map.layerPlumes,
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <HotspotMap
        location={location}
        bbox={boundsAround(location)}
        hotspots={shown}
        onSelect={setSelected}
        layers={layers}
        region={region}
        plumeHours={hours}
      />
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 12, right: 12, top: Math.max(insets.top, 12), gap: 8 }}
      >
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View
            style={{
              flex: 1,
              borderRadius: 28,
              paddingHorizontal: 14,
              backgroundColor: colors.glass,
              borderWidth: 1,
              borderColor: colors.glassBorder,
            }}
          >
            <LocationLine />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.mobile.toggleTheme}
            onPress={() => setTheme(isDark ? 'light' : 'dark')}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.glass,
            }}
          >
            <Icon name={isDark ? 'sun' : 'moon'} color={colors.ink} size={20} />
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {(['hotspots', 'plumes', 'density', 'wind'] as const).map((layer) => (
            <Pressable
              key={layer}
              accessibilityRole="button"
              accessibilityState={{ selected: layers.includes(layer) }}
              onPress={() =>
                setLayers((previous) =>
                  previous.includes(layer)
                    ? previous.filter((v) => v !== layer)
                    : [...previous, layer],
                )
              }
              style={{
                borderRadius: 22,
                paddingHorizontal: 14,
                paddingVertical: 9,
                backgroundColor: layers.includes(layer) ? colors.accent + '33' : colors.glass,
                borderWidth: 1,
                borderColor: colors.glassBorder,
              }}
            >
              <Copy
                style={{ fontSize: 12, color: layers.includes(layer) ? colors.accent : colors.ink }}
              >
                {labels[layer]}
              </Copy>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: region === value }}
              onPress={() => setRegion(value)}
              style={{
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 7,
                backgroundColor: colors.glass,
              }}
            >
              <Copy
                style={{ fontSize: 11, color: region === value ? colors.accent : colors.muted }}
              >
                {value ? t.map.viewRegion : t.map.viewLocal}
              </Copy>
            </Pressable>
          ))}
        </View>
      </View>
      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom, 12) + 86,
        }}
      >
        <Card>
          {selected ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Copy style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                  {t.map.detailTitle}
                </Copy>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.map.closeDetail}
                  onPress={() => setSelected(null)}
                >
                  <Icon name="close" size={18} color={colors.muted} />
                </Pressable>
              </View>
              <Copy heading style={{ fontSize: 20, marginVertical: 8 }}>
                {selected.lat.toFixed(3)}, {selected.lon.toFixed(3)}
              </Copy>
              <Copy muted style={{ fontSize: 11 }}>
                {t.map.acquired}: {formatDateTime(selected.acquiredAt, tz)}
              </Copy>
              <Copy style={{ fontSize: 12 }}>
                {t.map.frp}: {formatNumber(selected.frpMw, 1)} {t.mobile.powerUnit} ·{' '}
                {selected.satellite} · {selected.instrument}
              </Copy>
              <Copy muted style={{ fontSize: 10 }}>
                {t.map.hotspotDisclaimer}
              </Copy>
              <Source provenance={selected.provenance} timezone={tz} />
            </>
          ) : (
            <>
              <Copy
                style={{
                  fontSize: 10,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  fontFamily: nativeFonts.medium,
                  marginBottom: 8,
                }}
              >
                {t.map.plumesTitle}
              </Copy>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[0, 3, 6, 12].map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: hours === value }}
                    onPress={() => {
                      setHours(value);
                      if (!layers.includes('plumes')) setLayers((v) => [...v, 'plumes']);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 5,
                      alignItems: 'center',
                      borderRadius: 16,
                      backgroundColor: hours === value ? colors.accent + '33' : colors.subtle,
                    }}
                  >
                    <Copy
                      style={{
                        fontSize: 11,
                        color: hours === value ? colors.accent : colors.muted,
                      }}
                    >
                      {t.map.plumesHours(value)}
                    </Copy>
                  </Pressable>
                ))}
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'center',
                  marginTop: 10,
                }}
              >
                <Copy style={{ fontSize: 11, color: colors.accent }}>
                  {t.map.count(shown.length)}
                </Copy>
                {w?.windDirectionFromDeg != null && (
                  <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                    <WindArrow from={w.windDirectionFromDeg} />
                    <Copy style={{ fontSize: 10 }}>
                      {t.tiles.windFrom(compass(w.windDirectionFromDeg))},{' '}
                      {formatNumber(kmh(w.windSpeedMs))} {t.mobile.kmh}
                    </Copy>
                  </View>
                )}
              </View>
              <Copy muted style={{ fontSize: 10, lineHeight: 16, marginTop: 8 }}>
                {layers.includes('density') ? t.map.legendDensity : t.map.plumesNote}
              </Copy>
              <Copy muted style={{ fontSize: 9, lineHeight: 15, marginTop: 4 }}>
                {local.data?.state === 'demo' ? t.map.creditDemo : t.map.creditLive}
              </Copy>
              {local.isError && (
                <Copy style={{ fontSize: 10, color: colors.error }}>{t.mobile.requestError}</Copy>
              )}
            </>
          )}
        </Card>
      </View>
    </View>
  );
}
