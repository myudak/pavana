import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nativeFonts } from '@pavana/brand/native';
import { useSettings } from '../../lib/settings';
import { t } from '../../lib/copy';
import { Icon, type IconName } from '../../components/Icon';
import { Copy } from '../../components/ui';

const tabs: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: t.nav.today, icon: 'home' },
  { name: 'peta', label: t.nav.map, icon: 'map' },
  { name: 'prakiraan', label: t.nav.forecast, icon: 'chart' },
  { name: 'info', label: t.nav.info, icon: 'info' },
];
export default function TabLayout() {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={({ state, navigation }) => (
        <View
          style={{
            position: 'absolute',
            left: 12,
            right: 12,
            bottom: Math.max(insets.bottom, 12),
            alignItems: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              width: '100%',
              maxWidth: 448,
              padding: 6,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              backgroundColor: colors.glass,
              boxShadow: '0 12px 40px rgba(2,6,23,0.35)',
            }}
          >
            {state.routes.map((route, index) => {
              const tab = tabs.find((item) => item.name === route.name);
              if (!tab) return null;
              const selected = state.index === index;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!event.defaultPrevented) navigation.navigate(route.name);
                  }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: 8,
                    gap: 2,
                    borderRadius: 22,
                    backgroundColor: selected ? colors.accent + '26' : 'transparent',
                  }}
                >
                  <Icon name={tab.icon} size={22} color={selected ? colors.accent : colors.muted} />
                  <Copy
                    style={{
                      fontFamily: nativeFonts.medium,
                      fontSize: 10,
                      lineHeight: 16,
                      color: selected ? colors.accent : colors.muted,
                    }}
                  >
                    {tab.label}
                  </Copy>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.canvas },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingTop: 10,
        },
        tabBarLabelStyle: { fontFamily: nativeFonts.medium, fontSize: 10, paddingBottom: 4 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarAccessibilityLabel: tab.label,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} size={23} />,
          }}
        />
      ))}
    </Tabs>
  );
}
