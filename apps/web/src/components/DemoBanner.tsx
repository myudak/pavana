import { FlaskConical } from 'lucide-react';
import { useCopy } from '@/lib/i18n';

/** Must be visible on every screen that shows fixture data. */
export function DemoBanner() {
  const t = useCopy();
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-card border border-state-demo/30 bg-state-demo/10 px-3 py-2 text-sm text-ink"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-state-demo" aria-hidden />
      <p className="font-semibold" title={t.demoBannerDetail}>
        {t.demoBanner}
        <span className="sr-only"> — {t.demoBannerDetail}</span>
      </p>
    </div>
  );
}
