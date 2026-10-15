import type { LucideIcon } from 'lucide-react';
import { PRIORITY_TIER } from '@/components/priority-tier';
import { Badge } from '@/components/ui/badge';
import { useCopy } from '@/lib/i18n';
import type { Priority } from '@/lib/priorities';
import { cn } from '@/lib/utils';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const t = useCopy();
  return <Badge variant={PRIORITY_TIER[priority].badge}>{t.insights.notif.priority[priority]}</Badge>;
}

/** Icon chip; `pulse` adds a halo for things that need attention right now. */
export function PriorityIcon({
  priority,
  icon: Icon,
  pulse = false,
}: {
  priority: Priority;
  icon: LucideIcon;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center rounded-full',
        PRIORITY_TIER[priority].icon,
      )}
    >
      {pulse && priority === 'attention' && (
        <span
          aria-hidden
          className="absolute inset-0 animate-[pv-pulse-ring_2.4s_ease-out_infinite] rounded-full bg-warning/30"
        />
      )}
      <Icon className="relative size-5" aria-hidden />
    </span>
  );
}
