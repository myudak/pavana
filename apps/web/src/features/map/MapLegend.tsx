import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LEGEND_FRP } from './hotspot-style';

const AGE_VARS = ['--pv-fire-age-0', '--pv-fire-age-1', '--pv-fire-age-2', '--pv-fire-age-3'];

/** Compact hotspot legend: color = detection age, size = FRP. Collapsible. */
export function MapLegend({ className }: { className?: string }) {
  const t = useCopy();
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t.map.showLegend}
        aria-expanded={false}
        className={cn(
          'glass inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium',
          className,
        )}
      >
        <span aria-hidden className="flex -space-x-1">
          {AGE_VARS.slice(0, 3).map((v) => (
            <span
              key={v}
              className="size-2.5 rounded-full ring-1 ring-[var(--pv-fire-stroke)]"
              style={{ background: `var(${v})` }}
            />
          ))}
        </span>
        {t.map.legendTitle}
      </button>
    );
  }

  return (
    <section
      aria-label={t.map.legendTitle}
      className={cn(
        'glass w-[11.5rem] rounded-2xl px-3 py-2.5 text-[11px] leading-tight',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-foreground">{t.map.legendAge}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.map.hideLegend}
          aria-expanded
          className="-m-1 rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
          <Icon icon={Cancel01Icon} className="size-3.5" />
        </button>
      </div>
      <ul className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
        {t.map.ageClasses.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full ring-1 ring-[var(--pv-fire-stroke)]"
              style={{ background: `var(${AGE_VARS[i]})` }}
            />
            <span className="tabular">{label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-muted-foreground">{t.map.legendFrp}</p>
        <div aria-hidden className="flex items-end gap-1.5">
          {LEGEND_FRP.map((s) => (
            <span key={s.mw} className="flex flex-col items-center gap-0.5">
              <span
                className="rounded-full bg-[var(--pv-fire-age-1)]"
                style={{ width: s.px * 2, height: s.px * 2 }}
              />
              <span className="tabular text-[9px] text-muted-foreground">{s.mw}</span>
            </span>
          ))}
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">{t.map.legendCluster}</p>
    </section>
  );
}
