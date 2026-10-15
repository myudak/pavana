import { Notification03Icon } from '@hugeicons/core-free-icons';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import { Clock, CircleHelp, Flame, TrendingUp, type AppIcon } from '@/components/icons';
import { PriorityBadge, PriorityIcon } from '@/components/PriorityMarker';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { formatDateTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { NotificationSettings } from './NotificationSettings';
import { useSmartAlerts, type SmartAlert } from './use-smart-alerts';

const ICON: Record<SmartAlert['id'], AppIcon> = {
  combined: TrendingUp,
  'pm25-rise': TrendingUp,
  hotspots: Flame,
  'data-stale': Clock,
  'data-insufficient': CircleHelp,
};

/** Header bell: in-app list of current smart alerts + the (demo) notification opt-in. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useCopy();
  const a = t.alerts;
  const { alerts, location, ready } = useSmartAlerts();
  const needsAttention = alerts.some((x) => x.priority === 'attention');
  const tz = location?.timezone ?? 'Asia/Jakarta';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={needsAttention ? a.bellLabelUnread : a.bellLabel}
          className={cn('glass relative size-10 rounded-full', className)}
        >
          <Icon icon={Notification03Icon} className="size-5" />
          {needsAttention && (
            <span
              aria-hidden
              className="absolute right-2 top-2 size-2.5 rounded-full bg-warning ring-2 ring-background"
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{a.sheetTitle}</SheetTitle>
            <span className="rounded-full bg-state-demo/15 px-2 py-0.5 text-[11px] font-semibold text-state-demo ring-1 ring-state-demo/30">
              {a.status}
            </span>
          </div>
          <SheetDescription>
            {location ? `${location.name} · ` : ''}
            {t.insights.notif.note}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          ) : alerts.length === 0 ? (
            <p className="rounded-2xl bg-foreground/5 p-3 text-sm text-muted-foreground">
              {a.empty}
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((x) => (
                <li key={x.id} className="flex gap-3 rounded-2xl bg-foreground/5 p-3">
                  <PriorityIcon priority={x.priority} icon={ICON[x.id]} />
                  <div className="min-w-0 space-y-1">
                    <PriorityBadge priority={x.priority} />
                    <p className="font-medium leading-snug">{x.title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{x.body}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(x.validAt, tz)}
                      {x.isDemo && ` · ${a.demoSuffix}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <SheetClose asChild>
            <Link
              to="/prakiraan"
              className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground"
            >
              {a.seeForecast}
            </Link>
          </SheetClose>

          <section className="space-y-2 border-t border-foreground/10 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {a.settingsTitle}
            </h3>
            <NotificationSettings />
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
