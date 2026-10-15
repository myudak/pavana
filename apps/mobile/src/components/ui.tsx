import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { nativeFonts } from '@pavana/brand/native';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DataState, Provenance } from '@pavana/shared';
import { useSettings } from '../lib/settings';
import { t } from '../lib/copy';
import { formatDateTime } from '../lib/format';
import { Icon, type IconName } from './Icon';

export function Copy({
  children,
  muted,
  style,
  heading = false,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  heading?: boolean;
}) {
  const { colors } = useSettings();
  return (
    <Text
      style={[
        {
          fontFamily: heading ? nativeFonts.display : nativeFonts.body,
          fontSize: 14,
          lineHeight: 22,
          color: muted ? colors.muted : colors.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useSettings();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]}
    >
      {children}
    </View>
  );
}
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Copy heading style={{ fontSize: 20, lineHeight: 26, marginBottom: 14 }}>
      {children}
    </Copy>
  );
}
export function Action({
  label,
  icon,
  onPress,
  secondary,
  disabled,
}: {
  label: string;
  icon?: IconName;
  onPress(): void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useSettings();
  const color = secondary ? colors.primary : colors.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.primarySoft : colors.primary,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} color={color} size={18} />}
      <Copy style={{ color, fontFamily: nativeFonts.medium }}>{label}</Copy>
    </Pressable>
  );
}
export function Page({ children, title }: { children: ReactNode; title?: string }) {
  const { colors, location } = useSettings();
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.row}>
            <Icon name="wind" color={colors.primary} size={29} />
            <Copy heading style={{ fontSize: 29, lineHeight: 36, letterSpacing: -1.2 }}>
              {t.appName}
            </Copy>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.mobile.changeLocation}
            onPress={() => router.push('/lokasi')}
            style={[
              styles.locationChip,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <Icon name="pin" color={colors.primary} size={16} />
            <Copy style={{ fontSize: 12, maxWidth: 140 }}>{location.label}</Copy>
          </Pressable>
        </View>
        {title && (
          <Copy heading style={{ fontSize: 34, lineHeight: 40, letterSpacing: -1 }}>
            {title}
          </Copy>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function StateBadge({ state }: { state: DataState }) {
  const { colors } = useSettings();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: state === 'demo' ? colors.demoSoft : colors.surfaceMuted,
      }}
    >
      <Copy
        style={{
          fontSize: 11,
          lineHeight: 16,
          color: state === 'demo' ? colors.demo : state === 'error' ? colors.error : colors.muted,
        }}
      >
        {t.dataState[state]}
      </Copy>
    </View>
  );
}
export function DemoNotice({ show }: { show: boolean }) {
  const { colors } = useSettings();
  if (!show) return null;
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.demoSoft, borderColor: colors.demoSoft, padding: 14 },
      ]}
    >
      <Copy style={{ fontFamily: nativeFonts.medium, color: colors.demo, fontSize: 12 }}>
        {t.demoBanner}
      </Copy>
      <Copy muted style={{ fontSize: 11, lineHeight: 17 }}>
        {t.demoBannerDetail}
      </Copy>
    </View>
  );
}
export function Source({ provenance, timezone }: { provenance: Provenance; timezone: string }) {
  return (
    <Copy muted style={{ fontSize: 10, lineHeight: 17, marginTop: 10 }}>
      {t.common.source}: {provenance.provider} · {t.provenanceKind[provenance.kind]}
      {'\n'}
      {t.common.validAt} {formatDateTime(provenance.validAt, timezone)}
    </Copy>
  );
}
export function QueryBoundary<T>({
  query,
  children,
}: {
  query: UseQueryResult<T, Error>;
  children(data: T): ReactNode;
}) {
  const { colors } = useSettings();
  if (query.isError)
    return (
      <Card>
        <Copy heading>{t.common.errorTitle}</Copy>
        <Copy muted>{t.mobile.requestError}</Copy>
        <View style={{ marginTop: 14 }}>
          <Action
            label={t.common.retry}
            icon="refresh"
            onPress={() => {
              void query.refetch();
            }}
            secondary
          />
        </View>
      </Card>
    );
  if (query.isPending)
    return (
      <View style={{ padding: 30, gap: 8, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
        <Copy muted>{t.common.loading}</Copy>
      </View>
    );
  return <>{children(query.data)}</>;
}
export const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: 22,
    paddingBottom: 40,
    gap: 18,
  },
  card: { borderWidth: 1, borderRadius: 26, padding: 22 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  button: {
    minHeight: 46,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 8,
  },
});
