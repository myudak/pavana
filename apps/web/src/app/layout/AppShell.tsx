import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '@/components/Icon';
import { SceneBackground } from '@/components/SceneBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';
import { DesktopNav } from './DesktopNav';

/**
 * Mobile-first shell: landscape background, transparent top bar, frosted bottom
 * tab bar. On large screens the tabs move into the top bar. The map route is
 * full-bleed and draws its own chrome.
 */
export function AppShell() {
  const t = useCopy();
  const { pathname } = useLocation();
  const isMap = pathname.startsWith('/peta');
  const isHome = pathname === '/';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="relative isolate min-h-dvh text-foreground">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2"
        >
          Lewati ke konten
        </a>

        {!isMap && <SceneBackground tall={isHome} />}

        {!isMap && (
          <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 pb-1 pt-[max(env(safe-area-inset-top),1rem)] md:px-6">
            <Wordmark className="text-foreground drop-shadow-sm" />
            <DesktopNav />
            <ThemeToggle />
          </header>
        )}

        <main
          id="main"
          className={cn(
            isMap
              ? 'h-dvh'
              : 'mx-auto w-full max-w-5xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:px-6 lg:pb-16',
          )}
        >
          <Suspense
            fallback={
              <div className="space-y-3 pt-6" aria-busy aria-label={t.common.loading}>
                <Skeleton className="h-8 w-2/3 rounded-xl" />
                <Skeleton className="h-40 w-full rounded-3xl" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile tab bar */}
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-30 lg:hidden"
        >
          <ul className="glass mx-auto grid max-w-md grid-cols-4 rounded-[1.75rem] p-1.5 shadow-[0_12px_40px_rgba(2,6,23,0.35)]">
            {NAV_ITEMS.map(({ to, labelKey, icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-0.5 rounded-[1.4rem] py-2 text-[11px] font-medium transition-colors',
                      isActive
                        ? 'bg-haze/15 text-haze [&_svg]:drop-shadow-[0_0_8px_var(--pv-accent)]'
                        : 'text-muted-foreground',
                    )
                  }
                >
                  <Icon icon={icon} className="size-[22px]" />
                  {t.nav[labelKey]}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </TooltipProvider>
  );
}
