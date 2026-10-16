import { NavLink } from 'react-router';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';

/** Centered translucent pill navigation for large screens. */
export function DesktopNav({ className }: { className?: string }) {
  const t = useCopy();
  return (
    <nav aria-label="Navigasi utama" className={cn('hidden lg:block', className)}>
      <ul className="pill-glass flex h-[3.25rem] items-center gap-1 rounded-full p-1.5">
        {NAV_ITEMS.map(({ to, labelKey, icon, center }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-full px-[1.125rem] py-2.5 text-[0.9375rem] font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm dark:bg-gradient-to-r dark:from-primary dark:to-accent'
                    : 'text-ink-muted hover:bg-ink/[0.06] hover:text-ink',
                )
              }
            >
              {center ? (
                <Mascot pose="idle" size={22} decorative className="-my-1" />
              ) : (
                <Icon icon={icon} className="size-[1.125rem]" />
              )}{' '}
              {t.nav[labelKey]}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
