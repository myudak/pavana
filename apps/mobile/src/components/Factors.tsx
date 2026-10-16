import { View } from 'react-native';
import type { Factor } from '@pavana/shared';
import { nativeFonts } from '@pavana/brand/native';
import { describeFactor } from '../../../web/src/features/insights/factor-text';
import { t } from '../lib/copy';
import { useSettings } from '../lib/settings';
import { Copy } from './ui';
import { Icon, type IconName } from './Icon';

const icons: Record<Factor['id'], IconName> = {
  pm25_trend: 'chart',
  wind: 'wind',
  upwind_hotspots: 'map',
};
export function Factors({ factors, timezone }: { factors: Factor[]; timezone: string }) {
  const { colors } = useSettings();
  return (
    <View style={{ gap: 16 }}>
      {factors.map((factor) => (
        <View key={factor.id} style={{ flexDirection: 'row', gap: 10 }}>
          <View
            style={{
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.accent + '12',
              borderRadius: 12,
            }}
          >
            <Icon name={icons[factor.id]} color={colors.accent} size={20} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <Copy style={{ fontFamily: nativeFonts.medium, fontSize: 13 }}>
                {t.factor.title[factor.id]}
              </Copy>
              <Copy
                style={{
                  fontSize: 9,
                  lineHeight: 15,
                  borderRadius: 14,
                  paddingHorizontal: 6,
                  backgroundColor:
                    factor.signal === 'worsening' ? colors.accent + '22' : colors.subtle,
                  color: factor.signal === 'worsening' ? colors.accent : colors.muted,
                }}
              >
                {t.factor.signal[factor.signal]}
              </Copy>
            </View>
            <Copy muted style={{ fontSize: 12, lineHeight: 20 }}>
              {describeFactor(factor, t, timezone)}
            </Copy>
          </View>
        </View>
      ))}
    </View>
  );
}
