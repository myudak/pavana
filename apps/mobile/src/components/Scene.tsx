import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../lib/settings';
import dusk from '../../assets/dusk.webp';
import haze from '../../assets/haze.webp';

const BlurTarget = createContext<RefObject<View | null> | undefined>(undefined);
export const useBlurTarget = () => useContext(BlurTarget);

export function Scene({ children, tall = false }: { children: ReactNode; tall?: boolean }) {
  const target = useRef<View | null>(null);
  const { colors, isDark } = useSettings();
  const { height } = useWindowDimensions();
  const sceneHeight = Math.max(tall ? 520 : 320, height * (tall ? 0.78 : 0.46));
  return (
    <BlurTarget.Provider value={target}>
      <BlurTargetView ref={target} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.canvas }]} />
        <View style={{ height: sceneHeight }}>
          <Image
            source={isDark ? dusk : haze}
            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
            resizeMode="cover"
            accessible={false}
          />
          <LinearGradient
            colors={
              isDark
                ? [
                    'rgba(14,17,32,0.55)',
                    'rgba(14,17,32,0.25)',
                    'rgba(14,17,32,0.7)',
                    colors.canvas,
                  ]
                : [
                    'rgba(245,241,235,0.15)',
                    'rgba(245,241,235,0.05)',
                    'rgba(245,241,235,0.75)',
                    colors.canvas,
                  ]
            }
            locations={[0, 0.3, 0.7, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </BlurTargetView>
      {children}
    </BlurTarget.Provider>
  );
}
