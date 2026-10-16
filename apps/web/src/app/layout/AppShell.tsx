import { FlaskConical } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { SceneBackground } from '@/components/SceneBackground';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { AlertNotifier } from '@/features/notifications/AlertNotifier';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useCopy } from '@/lib/i18n';
import { useConditions } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';

/**
 * Global shell: transparent top bar over the hero (all pages), glass on scroll.
 * Desktop (lg+): horizontal bar — wordmark, brand lines, nav, location, bell.
 * Mobile (<lg): compact 52px bar (wordmark + theme + bell) + 32px location row
 * + bottom tab bar with five items, center Pavi slightly raised.
 */
function MobileDemoChip() {
  const t = useCopy();
  const { data } = useConditions();
  if (data?.state !== 'demo') return null;
  return (
    <p
      role="note"
      title={t.demoBannerDetail}
      aria-label={t.demoBannerDetail}
      className="inline-flex max-w-[45vw] items-center gap-1 rounded-full border border-glass-border bg-glass-hero px-2 py-0.5 text-[0.6875rem] text-ink backdrop-blur-md"
    >
      <FlaskConical className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{t.demoChip}</span>
    </p>
  );
}

export function AppShell() {
  const t = useCopy();
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const isMap = pathname.startsWith('/peta');
  const isChat = pathname.startsWith('/tanya');
  const isForecast = pathname.startsWith('/prakiraan');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="min-h-dvh overflow-x-clip bg-canvas text-ink"
      style={{ ['--mobile-tabbar-h' as string]: '4rem' }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>

      {(isChat || isForecast) && !isMap && <SceneBackground />}
      <AlertNotifier />

      {!isMap && (
        <header
          className={cn(
            'sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-150 md:pt-0',
            isChat && 'hidden lg:block',
            scrolled
              ? 'border-b border-hairline bg-canvas/[0.72] backdrop-blur-[14px] md:border-border/60 md:bg-canvas/85 md:backdrop-blur-xl'
              : 'border-b border-transparent bg-transparent',
            !scrolled && '[text-shadow:0_1px_12px_rgba(6,9,24,0.35)] md:[text-shadow:none]',
          )}
        >
          <div className="px-4 lg:px-[6.25vw]">
            <div className="mx-auto flex h-[3.25rem] w-full max-w-[84rem] items-center justify-between gap-3 lg:h-16">
              <div className="flex min-w-0 items-center gap-5">
                <Wordmark
                  className="shrink-0 dark:[filter:drop-shadow(0_0_14px_rgba(244,114,182,0.35))]"
                  wordClassName="text-[1.4rem] lg:text-[2.375rem]"
                />
                <div className="hidden h-8 w-px shrink-0 bg-white/15 lg:block" aria-hidden />
                <div className="hidden min-w-0 shrink-0 lg:block">
                  <p className="text-[0.6875rem] font-medium uppercase leading-tight tracking-[0.2em] text-ink-muted">
                    {t.brand.eyebrow}
                  </p>
                  <p className="mt-1 hidden text-[0.8125rem] leading-tight text-ink-muted xl:block">
                    {t.brand.tagline}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-4 lg:gap-8">
                <nav aria-label="Navigasi utama" className="hidden shrink-0 lg:block">
                  <ul className="flex items-center gap-10 border-b border-white/15">
                    {NAV_ITEMS.map(({ to, labelKey, icon, center }) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          end={to === '/'}
                          className={
                            center
                              ? 'mb-1 flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-hero px-3 py-1 text-sm font-medium text-ink backdrop-blur-md transition-colors hover:text-accent-strong aria-[current=page]:text-accent-strong'
                              : 'relative flex items-center gap-2 pb-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink aria-[current=page]:text-accent-strong'
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {center ? (
                                <Mascot pose="idle" size={22} decorative className="-my-1" />
                              ) : (
                                <Icon icon={icon} className="size-[1.125rem]" />
                              )}
                              {t.nav[labelKey]}
                              {!center && isActive && (
                                <span
                                  aria-hidden
                                  className="absolute inset-x-0 -bottom-px h-[2px] bg-gradient-to-r from-primary to-accent"
                                />
                              )}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </nav>
                <div className="flex shrink-0 items-center gap-1 lg:gap-4">
                  <div className="hidden lg:block">
                    <LocationPicker />
                  </div>
                  <ThemeToggle />
                  <NotificationBell className="border-transparent bg-transparent backdrop-blur-none hover:bg-surface-muted/70 lg:hover:bg-ink/[0.06]" />
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {!isMap && (
        <div className="px-4 lg:hidden">
          <div className="mx-auto flex min-h-8 w-full max-w-[84rem] items-center justify-between gap-2">
            <LocationPicker compact className="min-w-0" />
            <div className="flex shrink-0 items-center gap-1">
              <MobileDemoChip />
              <NotificationBell className="size-10 border-transparent bg-transparent backdrop-blur-none" />
            </div>
          </div>
        </div>
      )}

      <main
        id="main"
        className={cn(isMap ? 'flex min-h-0 flex-1 flex-col h-dvh' : 'flex min-h-0 flex-1 flex-col')}
      >
        <Suspense fallback={<p className="py-8 text-sm text-ink-muted">{t.common.loading}</p>}>
          <Outlet />
        </Suspense>
      </main>

      {!isMap && (
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas/60 pb-[env(safe-area-inset-bottom)] backdrop-blur-[16px] dark:bg-[#0c1126]/55 lg:hidden"
        >
          <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
            {NAV_ITEMS.map(({ to, labelKey, icon, center }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  aria-label={center ? t.chat.navLabel : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem]',
                      isActive
                        ? 'font-medium text-accent-strong dark:text-accent dark:[filter:drop-shadow(0_0_8px_rgba(244,114,182,0.55))]'
                        : 'text-ink-muted',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {center ? (
                        <span
                          className={cn(
                            '-mt-4 flex size-12 items-center justify-center overflow-hidden rounded-full bg-card shadow-[0_10px_28px_rgba(14,165,233,0.45)] ring-2',
                            isActive ? 'ring-[var(--pv-accent)]' : 'ring-transparent',
                          )}
                        >
                          <Mascot
                            pose={isActive ? 'joy' : 'idle'}
                            size={44}
                            decorative
                            className="translate-y-1"
                          />
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'flex size-8 items-center justify-center rounded-full',
                            isActive && 'bg-accent/15 [box-shadow:var(--pv-glow-accent)]',
                          )}
                        >
                          <Icon icon={icon} className="size-5" />
                        </span>
                      )}
                      {t.nav[labelKey]}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
