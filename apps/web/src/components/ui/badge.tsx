import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

const VARIANT = {
  default: 'bg-primary/15 text-primary-strong ring-primary/30',
  warning: 'bg-warning-soft text-warning-ink ring-warning/40',
  muted: 'bg-muted text-muted-foreground ring-border',
} as const;

/** Small status chip, same shape as the app's other chips. */
export function Badge({
  variant = 'default',
  className,
  ...props
}: ComponentProps<'span'> & { variant?: keyof typeof VARIANT }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
