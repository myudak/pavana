import type { Factor, FactorSignal } from '@pavana/shared';
import { Flame, TrendingUp, Wind, type LucideIcon } from 'lucide-react';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { describeFactor } from './factor-text';

const ICON: Record<Factor['id'], LucideIcon> = {
  pm25_trend: TrendingUp,
  wind: Wind,
  upwind_hotspots: Flame,
};

const SIGNAL_CLASS: Record<FactorSignal, string> = {
  worsening: 'bg-aq-unhealthy/15 text-aq-unhealthy',
  improving: 'bg-aq-good/15 text-aq-good',
  neutral: 'bg-surface-muted text-ink-muted',
  unknown: 'bg-surface-muted text-ink-muted',
};

export function FactorList({ factors, timeZone }: { factors: Factor[]; timeZone: string }) {
  const t = useCopy();
  return (
    <ul className="space-y-3">
      {factors.map((f) => {
        const Icon = ICON[f.id];
        return (
          <li
            key={f.id}
            className="flex gap-3 rounded-2xl border border-border/60 bg-surface/50 p-3"
          >
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong dark:text-accent">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{t.factor.title[f.id]}</p>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    SIGNAL_CLASS[f.signal],
                  )}
                >
                  {t.factor.signal[f.signal]}
                </span>
              </div>
              <p className="text-sm text-ink-muted">{describeFactor(f, t, timeZone)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
