import { Suspense } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { AlertNotifier } from '@/features/notifications/AlertNotifier';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { LocationPicker } from '@/features/location/LocationPicker';
import { DemoChip } from '@/components/DemoBanner';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';
import { DesktopNav } from './DesktopNav';

/**
 * Global shell: transparent top bar over every route (desktop bar floats
 * above the full-bleed map), glass pill nav in the center, round glass
 * buttons on the right. Mobile (<lg): compact bar + location row, main's
 * glass tab bar with the raised Pavi bubble in the middle.
 */

export function AppShell() {
  const t = useCopy();
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const isChat = pathname.startsWith('/tanya');
  const isForecast = pathname.startsWith('/prakiraan');
  const isMap = pathname.startsWith('/peta');
  const isInfo = pathname.startsWith('/info');
  // Home and Forecast render a full-bleed photo hero behind the bar, so the
  // mobile header stays transparent there (like Beranda). Other routes keep
  // a frosted backdrop so scrolled content never slides visibly under the bar.
  const isTransparentHero = isHome || isForecast;

  return (
    <div className="min-h-[var(--app-vh)] overflow-x-clip bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>

      {(isChat || isForecast) && <SceneBackground />}
      <AlertNotifier />

      {/* The map draws its own chrome; the shell header, location row and tab bar stay out. */}
      {!isMap && (
        <header
          className={cn(
            'sticky top-0 z-40 border-b border-transparent bg-transparent pt-[env(safe-area-inset-top)] transition-colors duration-150 lg:fixed lg:inset-x-0 lg:pt-[max(env(safe-area-inset-top),0.75rem)]',
            !isTransparentHero && 'max-lg:bg-canvas/85 max-lg:backdrop-blur-md',
            // The chat draws its own top bar on phones.
            isChat && 'hidden lg:block',
            '[text-shadow:0_1px_12px_rgba(6,9,24,0.35)] lg:[text-shadow:none]',
          )}
        >
          <div className="px-4 lg:px-[6.25vw]">
            <div className="mx-auto flex h-[3.25rem] w-full max-w-[84rem] items-center justify-between gap-3 lg:grid lg:h-[var(--topbar-h)] lg:grid-cols-[1fr_auto_1fr] lg:gap-4">
              {/* Left: olive wordmark */}
              <div className="flex min-w-0 items-center justify-start">
                <Wordmark
                  className="shrink-0 dark:[filter:drop-shadow(0_0_14px_rgba(244,114,182,0.35))]"
                  wordClassName="text-[1.4rem] lg:text-[2.375rem]"
                />
              </div>

              {/* Center: translucent pill nav (desktop only) */}
              <DesktopNav className="justify-self-center" />

              {/* Right: demo chip, location pill + two round glass buttons */}
              <div className="flex shrink-0 items-center justify-end gap-2 lg:gap-2.5">
                <DemoChip className="hidden lg:inline-flex" />
                <div className="hidden lg:block">
                  <LocationPicker />
                </div>
                <DemoChip className="lg:hidden" />
                <NotificationBell className="size-10 lg:size-11" />
                <ThemeToggle className="size-10 lg:size-11" />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Mobile location row (Home only): no backdrop, scrolls away with content. */}
      {isHome && !isMap && (
        <div className="px-4 lg:hidden">
          <div className="mx-auto flex min-h-8 w-full max-w-[84rem] items-center justify-between gap-2">
            <LocationPicker compact className="min-w-0" />
          </div>
        </div>
      )}

      <main
        id="main"
        className={cn(
          isMap ? 'flex min-h-0 flex-1 flex-col h-[var(--app-vh)]' : 'flex min-h-0 flex-1 flex-col',
          // Fixed desktop header floats above content: reserve its height,
          // except on Home (the hero has its own spacer).
          // Info/Forecast own the full offset inside PageContainer (topbar + gap).
          !isMap && !isHome && !isInfo && !isForecast && 'lg:pt-[var(--topbar-h)]',
        )}
      >
        <Suspense fallback={<p className="py-8 text-sm text-ink-muted">{t.common.loading}</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile tab bar: glass bar + raised Pavi bubble, on every route including the map. */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-3 bottom-[max(env(safe-area-inset-bottom),0.75rem)] z-40 lg:hidden"
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
                      'relative -mt-8 flex flex-col items-center gap-0.5 pb-2 text-[0.6875rem] font-medium',
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
                      'flex flex-col items-center gap-0.5 rounded-[1.4rem] py-2 text-[0.6875rem] font-medium transition-colors',
                      isActive
                        ? 'bg-haze/15 text-haze [&_svg]:drop-shadow-[0_0_8px_var(--pv-accent)]'
                        : 'text-muted-foreground',
                    )
                  }
                >
                  <Icon icon={icon} className="size-[1.375rem]" />
                  {t.nav[labelKey]}
                </NavLink>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
