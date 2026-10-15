import Svg, { Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

const paths = {
  home: 'm3 10 9-7 9 7v10h-6v-7H9v7H3V10Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6',
  moon: 'M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z',
  wind: 'M3 7h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h6a3 3 0 1 1-3 3',
  sun: 'M12 3v1m0 16v1M3 12h1m16 0h1M5.6 5.6l.7.7m11.4 11.4.7.7m0-12.8-.7.7M6.3 17.7l-.7.7M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  chart: 'M4 3v17h17M7 14l4-5 4 3 5-7',
  info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  chevron: 'm9 5 7 7-7 7',
  close: 'm6 6 12 12M6 18 18 6',
  arrow: 'M12 20V4m-6 6 6-6 6 6',
  refresh: 'M20 7V3l-3 3a8 8 0 1 0 3 9M20 3h-5',
  check: 'm5 12 4 4L19 6',
  external: 'M14 3h7v7m-11 4L21 3M10 3H3v18h18v-7',
} as const;
export type IconName = keyof typeof paths;
export function Icon({
  name,
  color,
  size = 24,
}: {
  name: IconName;
  color: ColorValue;
  size?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <Path d={paths[name]} />
    </Svg>
  );
}
