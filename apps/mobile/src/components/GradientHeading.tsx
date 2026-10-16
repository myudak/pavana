import { Text, type TextStyle } from 'react-native';
import { nativeFonts } from '@pavana/brand/native';
import { useSettings } from '../lib/settings';
export default function GradientHeading({ children }: { children: string }) {
  const { colors } = useSettings();
  return (
    <Text
      accessibilityRole="header"
      style={
        {
          fontFamily: nativeFonts.display,
          fontSize: 40,
          lineHeight: 43,
          letterSpacing: -1.4,
          color: colors.accent,
          backgroundImage: `linear-gradient(90deg, ${colors.accent}, ${colors.primary})`,
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } as TextStyle
      }
    >
      {children}
    </Text>
  );
}
