import { Alert, Linking, Pressable, View } from 'react-native';
import { nativeFonts } from '@pavana/brand/native';
import { useOfficialLinks } from '../../lib/queries';
import { useSettings, type ThemePref, type DataMode } from '../../lib/settings';
import { apiConfigured } from '../../lib/api';
import { t } from '../../lib/copy';
import { Card, Copy, Page, QueryBoundary, SectionTitle } from '../../components/ui';
import { Icon } from '../../components/Icon';

export default function InfoScreen() {
  const links = useOfficialLinks();
  const { colors, theme, setTheme, mode, setMode } = useSettings();
  function open(url: string) {
    void Linking.openURL(url).catch(() => Alert.alert(t.common.errorTitle, t.mobile.openLinkError));
  }
  return (
    <Page title={t.info.title}>
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
        <SectionTitle>{t.mobile.dataSource}</SectionTitle>
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
                {value === 'demo' ? t.mobile.bundledDemo : t.mobile.backend}
              </Copy>
              {mode === value && <Icon name="check" color={colors.primary} size={17} />}
            </View>
            <Copy muted style={{ fontSize: 11 }}>
              {value === 'demo'
                ? t.mobile.demoDescription
                : apiConfigured
                  ? t.mobile.backendDescription
                  : t.mobile.backendUnavailable}
            </Copy>
          </Pressable>
        ))}
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
        {t.mobile.version}
      </Copy>
    </Page>
  );
}
