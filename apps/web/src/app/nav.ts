import { BarChart3, House, Info, Map, type LucideIcon } from 'lucide-react';
import type { Copy } from '@/lib/i18n';

export interface NavItem {
  to: string;
  labelKey: keyof Copy['nav'];
  icon: LucideIcon;
}

/** Single source for bottom nav (mobile) and side nav (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'today', icon: House },
  { to: '/peta', labelKey: 'map', icon: Map },
  { to: '/insight', labelKey: 'insights', icon: BarChart3 },
  { to: '/info', labelKey: 'info', icon: Info },
];
