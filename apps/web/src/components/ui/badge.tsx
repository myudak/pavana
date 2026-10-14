import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary-soft text-primary-strong',
        muted: 'bg-surface-muted text-ink-muted',
        outline: 'border border-border text-ink',
        demo: 'bg-state-demo/15 text-state-demo',
        stale: 'bg-state-stale/15 text-state-stale',
        error: 'bg-state-error/15 text-state-error',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
