import { ChartIncreaseIcon, FastWindIcon, FireIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react';
import type { Factor, FactorSignal } from '@pavana/shared';
import { Icon } from '@/components/Icon';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { describeFactor } from './factor-text';

const ICON: Record<Factor['id'], IconSvgElement> = {
  pm25_trend: ChartIncreaseIcon,
  wind: FastWindIcon,
  upwind_hotspots: FireIcon,
};

const SIGNAL_CLASS: Record<FactorSignal, string> = {
  worsening: 'bg-exp-high/15 text-exp-high ring-exp-high/40',
  improving: 'bg-exp-none/15 text-exp-none ring-exp-none/40',
  neutral: 'bg-primary/10 text-primary-strong ring-primary/30',
  unknown: 'bg-muted text-muted-foreground ring-border',
};

const ICON_CLASS: Record<FactorSignal, string> = {
  worsening: 'text-exp-high',
  improving: 'text-exp-none',
  neutral: 'text-primary-strong',
  unknown: 'text-muted-foreground',
};

export function FactorList({
  factors,
  timeZone,
  compact = false,
}: {
  factors: Factor[];
  timeZone: string;
  compact?: boolean;
}) {
  const t = useCopy();
  return (
    <ul className="divide-y divide-foreground/10">
      {factors.map((f) => (
        <li key={f.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/5">
            <Icon icon={ICON[f.id]} className={cn('size-5', ICON_CLASS[f.signal])} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-snug">{t.factor.title[f.id]}</p>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1',
                  SIGNAL_CLASS[f.signal],
                )}
              >
                {t.factor.signal[f.signal]}
              </span>
            </div>
            <p
              className={cn(
                'mt-0.5 text-sm leading-relaxed text-muted-foreground',
                compact && 'line-clamp-2',
              )}
            >
              {describeFactor(f, t, timeZone)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
