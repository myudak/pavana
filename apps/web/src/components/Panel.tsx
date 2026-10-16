import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/** Frosted section card with an uppercase eyebrow title and optional link. */
export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  action?: { to: string; label: string };
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('glass rounded-3xl p-4 sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {title}
            </h2>
          )}
          {action && (
            <Link
              to={action.to}
              className="-my-1 inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium text-primary-strong hover:bg-accent"
            >
              {action.label}
              <Icon icon={ArrowRight01Icon} className="size-3.5" />
            </Link>
          )}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
