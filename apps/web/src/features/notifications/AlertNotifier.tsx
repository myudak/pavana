import { useEffect } from 'react';
import { useCopy } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { useSmartAlerts } from './use-smart-alerts';

const LAST_KEY = 'pavana:notify:last';

/**
 * DEMO notifier: while the app is open and the user opted in, shows a system
 * notification once per new "attention" alert (per location + rule + data time).
 * Nothing runs when the tab is closed — that needs server-side Web Push (backlog).
 */
export function AlertNotifier() {
  const t = useCopy();
  const { enabled, send } = useNotifications();
  const { alerts, location, ready } = useSmartAlerts();
  const top = alerts.find((x) => x.priority === 'attention');
  const key = top && location ? `${location.id}:${top.id}:${top.validAt}` : null;

  useEffect(() => {
    if (!enabled || !ready || !top || !key || !location) return;
    try {
      if (localStorage.getItem(LAST_KEY) === key) return;
      localStorage.setItem(LAST_KEY, key);
    } catch {
      // No storage: still notify; worst case it repeats on reload.
    }
    const suffix = top.isDemo ? ` · ${t.alerts.demoSuffix}` : '';
    void send({
      title: `${top.title} · ${location.name}`,
      body: `${top.body} ${t.insights.notif.note}${suffix}`,
      tag: `pavana-alert-${location.id}`,
      url: '/prakiraan',
    });
  }, [enabled, ready, key, top, location, send, t]);

  return null;
}
