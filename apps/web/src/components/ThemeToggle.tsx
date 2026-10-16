import { Moon, Sun } from 'lucide-react';
import { useCopy } from '@/lib/i18n';
import { useDarkMode, useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

/**
 * Single light/dark switch for the app shell header. It sets an explicit
 * preference (light | dark) based on the *effective* theme, so the first click
 * always flips what you currently see — even when the stored pref is "system".
 * The three-way choice (including "Sistem") stays on the Info page.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useCopy();
  const { setPref } = useTheme();
  const dark = useDarkMode();
  const label = dark ? t.info.themeToggle.toLight : t.info.themeToggle.toDark;

  return (
    <button
      type="button"
      onClick={() => setPref(dark ? 'light' : 'dark')}
      aria-label={label}
      title={label}
      className={cn(
        'pill-glass inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:text-accent-strong',
        className,
      )}
    >
      {dark ? (
        <Sun className="size-5 lg:size-[1.375rem]" aria-hidden />
      ) : (
        <Moon className="size-5 lg:size-[1.375rem]" aria-hidden />
      )}
    </button>
  );
}
