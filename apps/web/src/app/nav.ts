import {
  ChartLineData02Icon,
  Home09Icon,
  InformationCircleIcon,
  MapsIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import type { Copy } from '@/lib/i18n';

export interface NavItem {
  to: string;
  labelKey: keyof Copy['nav'];
  icon: IconSvgElement;
}

/** Single source for the bottom tab bar (mobile) and the header nav (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'today', icon: Home09Icon },
  { to: '/peta', labelKey: 'map', icon: MapsIcon },
  { to: '/prakiraan', labelKey: 'forecast', icon: ChartLineData02Icon },
  { to: '/info', labelKey: 'info', icon: InformationCircleIcon },
];
