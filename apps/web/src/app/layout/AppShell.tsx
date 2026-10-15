import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { AlertNotifier } from '@/features/notifications/AlertNotifier';
import { NotificationBell } from '@/features/notifications/NotificationBell';
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
  const isChat = pathname.startsWith('/tanya');

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
        <AlertNotifier />

        {!isMap && (
          <header
            className={cn(
              'mx-auto w-full max-w-5xl items-center justify-between gap-3 px-4 pb-1 pt-[max(env(safe-area-inset-top),1rem)] md:px-6',
              // The chat draws its own top bar on phones.
              isChat ? 'hidden lg:flex' : 'flex',
            )}
          >
            <Wordmark className="text-foreground drop-shadow-sm" />
            <DesktopNav />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
        )}

        <main
          id="main"
          className={cn(
            isMap
              ? 'h-dvh'
              : isChat
                ? 'mx-auto w-full max-w-3xl px-4 md:px-6'
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
          <ul className="glass mx-auto grid max-w-md grid-cols-5 items-end rounded-[1.75rem] p-1.5 shadow-[0_12px_40px_rgba(2,6,23,0.35)]">
            {NAV_ITEMS.map(({ to, labelKey, icon, center }) => (
              <li key={to}>
                {center ? (
                  <NavLink
                    to={to}
                    aria-label={t.chat.navLabel}
                    className={({ isActive }) =>
                      cn(
                        'relative -mt-8 flex flex-col items-center gap-0.5 pb-2 text-[11px] font-medium',
                        isActive ? 'text-haze' : 'text-muted-foreground',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'flex size-[3.75rem] items-center justify-center rounded-full bg-gradient-to-br from-sky-300 via-emerald-200 to-sky-400 p-[3px] shadow-[0_10px_28px_rgba(14,165,233,0.45)] transition-transform active:scale-95',
                            isActive &&
                              'shadow-[0_0_0_3px_var(--pv-accent),0_10px_28px_rgba(14,165,233,0.45)]',
                          )}
                        >
                          <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-card">
                            <Mascot
                              pose={isActive ? 'joy' : 'idle'}
                              size={50}
                              decorative
                              className="translate-y-1"
                            />
                          </span>
                        </span>
                        {t.nav[labelKey]}
                      </>
                    )}
                  </NavLink>
                ) : (
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
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </TooltipProvider>
  );
}
