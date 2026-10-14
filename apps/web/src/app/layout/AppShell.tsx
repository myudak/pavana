import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Wordmark } from '@/components/Wordmark';
import { LocationPicker } from '@/features/location/LocationPicker';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from '../nav';

/** Mobile: sticky header + bottom tab bar. Desktop (lg+): side navigation. */
export function AppShell() {
  const t = useCopy();
  return (
    <div className="min-h-dvh bg-canvas text-ink lg:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2"
      >
        Lewati ke konten
      </a>

      {/* Desktop side nav */}
      <aside className="hidden w-60 shrink-0 border-r border-border px-4 py-6 lg:block">
        <Wordmark className="px-2" />
        <nav className="mt-8 space-y-1" aria-label="Navigasi utama">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-full px-3 py-2 text-sm',
                  isActive
                    ? 'bg-primary-soft font-medium text-primary-strong'
                    : 'text-ink-muted hover:bg-surface-muted',
                )
              }
            >
              <Icon className="size-4" aria-hidden /> {t.nav[labelKey]}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-canvas/90 px-4 py-3 backdrop-blur lg:justify-end lg:px-8">
          <Wordmark className="lg:hidden" />
          <LocationPicker />
        </header>

        <main
          id="main"
          className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-2 lg:px-8 lg:pb-12"
        >
          <Suspense fallback={<p className="py-8 text-sm text-ink-muted">{t.common.loading}</p>}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
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
                    isActive ? 'font-medium text-primary-strong' : 'text-ink-muted',
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
