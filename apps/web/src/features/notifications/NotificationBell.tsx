import { Notification03Icon } from '@hugeicons/core-free-icons';
import { Link } from 'react-router';
import { Icon } from '@/components/Icon';
import {
  Check,
  ChevronDown,
  CircleHelp,
  Clock,
  ExternalLink,
  Flame,
  Landmark,
  TrendingUp,
  type AppIcon,
} from '@/components/icons';
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
  official: Landmark,
  'data-stale': Clock,
  'data-insufficient': CircleHelp,
};

/** Header bell: in-app list of current smart alerts + the (demo) notification opt-in. */
export function NotificationBell({ className }: { className?: string }) {
  const t = useCopy();
  const a = t.alerts;
  const rec = t.insights.rec;
  const { alerts, location, ready, vars, shownLinks, isDemo } = useSmartAlerts();
  const needsAttention = alerts.some((x) => x.priority === 'attention');
  const tz = location?.timezone ?? 'Asia/Jakarta';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={needsAttention ? a.bellLabelUnread : a.bellLabel}
          className={cn('pill-glass relative size-11 rounded-full', className)}
        >
          <Icon icon={Notification03Icon} className="size-5" />
          {needsAttention && (
            <span
              aria-hidden
              className="absolute right-2 top-2 size-2.5 rounded-full bg-warning ring-2 ring-white/70 dark:ring-white/35"
            />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="pv-scroll w-full max-w-[100dvw] gap-0 overflow-y-auto sm:max-w-sm"
      >
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

        <div className="min-w-0 space-y-4 px-4 pb-6">
          {!ready ? (
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          ) : alerts.length === 0 ? (
            <p className="rounded-2xl bg-foreground/5 p-3 text-sm text-muted-foreground">
              {a.empty}
            </p>
          ) : (
            <ul className="max-h-[70dvh] space-y-2 overflow-y-auto overscroll-contain">
              {alerts.map((x) => {
                const rule = rec.rules[x.id];
                return (
                  <li
                    key={x.id}
                    className="flex min-w-0 gap-3 break-words rounded-2xl bg-foreground/5 p-3"
                  >
                    <PriorityIcon priority={x.priority} icon={ICON[x.id]} />
                    <div className="min-w-0 max-w-full flex-1 space-y-1 break-words">
                      <PriorityBadge priority={x.priority} />
                      <p className="break-words font-medium leading-snug">{x.title}</p>
                      <p className="break-words text-sm leading-relaxed text-muted-foreground">
                        {x.body}
                      </p>
                      <p className="break-words text-[11px] text-muted-foreground">
                        {x.id === 'official' ? (
                          t.info.linksTitle
                        ) : (
                          <>
                            {formatDateTime(x.validAt, tz)}
                            {x.isDemo && ` · ${a.demoSuffix}`}
                          </>
                        )}
                      </p>
                      {x.id === 'official' && shownLinks.length > 0 && (
                        <ul className="max-w-full space-y-1">
                          {shownLinks.map((l) => (
                            <li key={l.id} className="min-w-0">
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-11 min-w-0 items-center gap-2 text-sm hover:opacity-80"
                              >
                                <span className="min-w-0 flex-1 break-words">
                                  <span className="font-medium">{l.title}</span>
                                  <span className="text-muted-foreground"> · {l.publisher}</span>
                                </span>
                                <ExternalLink
                                  className="size-4 shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      <details data-accordion className="group pt-1">
                        <summary className="flex min-h-9 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-primary-strong">
                          {rec.open}
                          <ChevronDown
                            className="size-4 transition-transform group-open:rotate-180"
                            aria-hidden
                          />
                        </summary>
                        <div className="space-y-2 pt-2 text-sm">
                          <p className="text-xs text-muted-foreground">
                            {rule.trigger(vars)} {rule.reason(vars)}
                          </p>
                          <ul className="space-y-1.5">
                            {rule.actions.map((action) => (
                              <li key={action} className="flex gap-2">
                                <Check
                                  className="mt-0.5 size-4 shrink-0 text-primary-strong"
                                  aria-hidden
                                />
                                <span className="min-w-0 break-words">{action}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-muted-foreground">
                            {rule.limit}
                            {isDemo ? ` · ${rec.illustrativeNote}` : ''}
                          </p>
                        </div>
                      </details>
                    </div>
                  </li>
                );
              })}
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

          <p className="text-xs text-muted-foreground">{t.insights.notif.note}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
