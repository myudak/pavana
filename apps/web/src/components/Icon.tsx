import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { cn } from '@/lib/utils';

/** Hugeicons with the app defaults. Decorative by default; pass `label` when it carries meaning. */
export function Icon({
  icon,
  className,
  strokeWidth = 1.8,
  label,
  style,
}: {
  icon: IconSvgElement;
  className?: string;
  strokeWidth?: number;
  label?: string;
  style?: React.CSSProperties;
}) {
  return (
    <HugeiconsIcon
      icon={icon}
      strokeWidth={strokeWidth}
      className={cn('size-5 shrink-0', className)}
      style={style}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
