import { NavLink } from 'react-router';
import { Icon } from '@/components/Icon';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';

/** Pill navigation for large screens (the mobile tab bar is hidden there). */
export function DesktopNav({ className }: { className?: string }) {
  const t = useCopy();
  return (
    <nav
      aria-label="Navigasi utama"
      className={cn('glass hidden rounded-full p-1 lg:flex', className)}
    >
      {NAV_ITEMS.map(({ to, labelKey, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )
          }
        >
          <Icon icon={icon} className="size-4" /> {t.nav[labelKey]}
        </NavLink>
      ))}
    </nav>
  );
}
