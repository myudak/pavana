import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';
import { nativeFonts } from '@pavana/brand/native';
import { useSettings } from '../lib/settings';

export default function GradientHeading({ children }: { children: string }) {
  const { colors } = useSettings();
  const textStyle = {
    fontFamily: nativeFonts.display,
    fontSize: 40,
    lineHeight: 43,
    letterSpacing: -1.4,
  };
  return (
    <MaskedView
      accessibilityRole="header"
      accessibilityLabel={children}
      maskElement={<Text style={textStyle}>{children}</Text>}
    >
      <LinearGradient
        colors={[colors.accent, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text accessible={false} style={[textStyle, { opacity: 0 }]}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
}
