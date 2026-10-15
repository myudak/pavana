import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { useCopy } from '@/lib/i18n';
import { useDarkMode, useTheme } from '@/lib/theme-context';
import { cn } from '@/lib/utils';

/** One tap flips Dusk (dark) ↔ Haze (light). Full light/dark/system choice lives on Info. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useCopy();
  const { setPref } = useTheme();
  const dark = useDarkMode();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t.theme.toggle}
      onClick={() => setPref(dark ? 'light' : 'dark')}
      className={cn('glass size-10 rounded-full', className)}
    >
      <Icon icon={dark ? Sun03Icon : Moon02Icon} className="size-5" />
    </Button>
  );
}
