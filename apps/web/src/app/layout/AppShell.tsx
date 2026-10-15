import { Bell } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Wordmark } from '@/components/Wordmark';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';

/**
 * Global shell: transparent top bar over the hero (all pages), glass on scroll.
 * Desktop (lg+): horizontal bar — wordmark, brand lines, nav, location, bell.
 * Mobile (<lg): compact bar (wordmark + location + bell) + bottom tab bar.
 */
export function AppShell() {
  const t = useCopy();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-dvh overflow-x-clip bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>

      <header
        className={cn(
          'sticky top-0 z-30 transition-colors',
          scrolled
            ? 'border-b border-border/60 bg-canvas/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <div className="px-[6.25vw]">
          <div className="mx-auto flex h-16 w-full max-w-[1344px] items-center justify-between gap-3">
            {/* Left: wordmark + divider + brand lines */}
            <div className="flex min-w-0 items-center gap-5">
              <Wordmark
                className="shrink-0 dark:[filter:drop-shadow(0_0_14px_rgba(244,114,182,0.35))]"
                wordClassName="text-[1.4rem] lg:text-[38px]"
              />
              <div className="hidden h-8 w-px shrink-0 bg-white/15 lg:block" aria-hidden />
              <div className="hidden min-w-0 shrink-0 lg:block">
                <p className="text-[11px] font-medium uppercase leading-tight tracking-[0.2em] text-ink-muted">
                  {t.brand.eyebrow}
                </p>
                <p className="mt-1 hidden text-[13px] leading-tight text-ink-muted xl:block">
                  {t.brand.tagline}
                </p>
              </div>
            </div>

            {/* Right: nav + location + theme + bell */}
            <div className="flex min-w-0 items-center gap-4 lg:gap-8">
              <nav aria-label="Navigasi utama" className="hidden shrink-0 lg:block">
                <ul className="flex items-center gap-10 border-b border-white/15">
                  {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === '/'}
                        className="relative flex items-center gap-2 pb-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink aria-[current=page]:text-accent-strong"
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className="size-[18px]" aria-hidden />
                            {t.nav[labelKey]}
                            {isActive && (
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
              <div className="flex shrink-0 items-center gap-3 lg:gap-4">
                <LocationPicker />
                <ThemeToggle />
                {/* No notification feature yet: honestly disabled, no dot without real state. */}
                <button
                  type="button"
                  aria-disabled="true"
                  aria-label={t.notifications.soon}
                  title={t.notifications.soon}
                  className="cursor-not-allowed text-ink-muted hover:text-ink"
                >
                  <Bell className="size-[22px]" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<p className="py-8 text-sm text-ink-muted">{t.common.loading}</p>}>
          <Outlet />
        </Suspense>
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 py-2.5 text-xs',
                    isActive
                      ? 'font-medium text-primary-strong dark:text-accent dark:[filter:drop-shadow(0_0_8px_rgba(244,114,182,0.55))]'
                      : 'text-ink-muted',
                  )
                }
              >
                <Icon className="size-5" aria-hidden />
                {t.nav[labelKey]}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
