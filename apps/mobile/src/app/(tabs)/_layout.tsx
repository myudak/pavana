import { Tabs } from 'expo-router';
import { nativeFonts } from '@pavana/brand/native';
import { useSettings } from '../../lib/settings';
import { t } from '../../lib/copy';
import { Icon, type IconName } from '../../components/Icon';

const tabs: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: t.nav.today, icon: 'sun' },
  { name: 'peta', label: t.nav.map, icon: 'map' },
  { name: 'insight', label: t.nav.insights, icon: 'chart' },
  { name: 'info', label: t.nav.info, icon: 'info' },
];
export default function TabLayout() {
  const { colors } = useSettings();
  return (
    <Tabs
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
