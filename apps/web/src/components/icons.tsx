/**
 * Named icon components (same names as the ones used in the ported Insight/Info code)
 * rendered with Hugeicons, so every icon in the app comes from one family.
 */
import {
  Activity01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  BookOpen01Icon,
  ChartDecreaseIcon,
  ChartIncreaseIcon,
  Clock01Icon,
  FireIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  LinkSquare02Icon,
  MinusSignIcon,
  RefreshIcon,
  ShieldEnergyIcon,
  Tick02Icon,
  UniversityIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface AppIconProps {
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  'aria-hidden'?: boolean | 'true' | 'false';
}
export type AppIcon = (props: AppIconProps) => React.ReactElement;

function make(icon: IconSvgElement): AppIcon {
  return function AppIconImpl({ className, style, strokeWidth = 1.8, ...rest }: AppIconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        strokeWidth={strokeWidth}
        className={cn('size-4 shrink-0', className)}
        style={style}
        aria-hidden={rest['aria-hidden'] ?? true}
      />
    );
  };
}

export const Activity = make(Activity01Icon);
export const AlertTriangle = make(Alert02Icon);
export const ArrowRight = make(ArrowRight01Icon);
export const BookOpen = make(BookOpen01Icon);
export const Check = make(Tick02Icon);
export const ChevronDown = make(ArrowDown01Icon);
export const CircleHelp = make(HelpCircleIcon);
export const Clock = make(Clock01Icon);
export const ExternalLink = make(LinkSquare02Icon);
export const Flame = make(FireIcon);
export const Info = make(InformationCircleIcon);
export const Landmark = make(UniversityIcon);
export const Minus = make(MinusSignIcon);
export const RefreshCw = make(RefreshIcon);
export const ShieldAlert = make(ShieldEnergyIcon);
export const TrendingDown = make(ChartDecreaseIcon);
export const TrendingUp = make(ChartIncreaseIcon);
