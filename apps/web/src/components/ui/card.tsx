import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/** Frosted card in the same style as <Panel> (used by the Insight/Info widgets). */
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('glass rounded-3xl p-4 sm:p-5', className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header className={cn('mb-3 flex items-center justify-between gap-3', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-xs font-medium uppercase tracking-[0.2em] text-ink-muted', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn(className)} {...props} />;
}
