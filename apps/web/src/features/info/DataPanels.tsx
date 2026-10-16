import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import type { SourceStatus } from '@pavana/shared';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { Panel } from '@/components/Panel';
import { QueryState } from '@/components/QueryState';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { api } from '@/lib/api';
import { useDemoMode } from '@/lib/demo-mode';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/** Live ↔ demo switch. Demo is the synthetic September scenario, always labelled. */
export function DataModePanel({ className }: { className?: string }) {
  const t = useCopy();
  const { demo, setDemo } = useDemoMode();
  return (
    <Panel title={t.mode.title} className={className}>
      <ToggleGroup
        type="single"
        value={demo ? 'demo' : 'live'}
        onValueChange={(v) => v && setDemo(v === 'demo')}
        className="w-full rounded-full bg-foreground/5 p-1"
        indicatorClassName="bg-primary shadow-sm"
        aria-label={t.mode.title}
      >
        {(['live', 'demo'] as const).map((m) => (
          <ToggleGroupItem
            key={m}
            value={m}
            className="h-9 flex-1 rounded-full data-[state=on]:text-primary-foreground"
          >
            {t.mode[m]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {demo ? t.mode.demoBody : t.mode.liveBody}
      </p>
    </Panel>
  );
}

const STATUS_CLASS: Record<SourceStatus, string> = {
  ok: 'bg-exp-none/15 text-exp-none ring-exp-none/30',
  error: 'bg-state-error/15 text-state-error ring-state-error/30',
  not_configured: 'bg-muted text-muted-foreground ring-border',
  fixture: 'bg-state-demo/20 text-state-demo ring-state-demo/30',
};

/** Each upstream source with its current status (from /api/sources). */
export function SourcesPanel({ className }: { className?: string }) {
  const t = useCopy();
  const sources = useQuery({ queryKey: ['sources'], queryFn: ({ signal }) => api.sources(signal) });
  return (
    <Panel title={t.sources.title} className={className}>
      <QueryState query={sources} inline>
        {(d) => (
          <ul className="divide-y divide-foreground/10">
            {d.sources.map((s) => (
              <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex min-w-0 items-center gap-1 font-medium"
                  >
                    <span className="group-hover:underline">{s.name}</span>
                    <Icon icon={ArrowUpRight01Icon} className="size-3.5 text-muted-foreground" />
                  </a>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                      STATUS_CLASS[s.status],
                    )}
                  >
                    {t.sources.status[s.status]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{s.use}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.attribution}</p>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </Panel>
  );
}
