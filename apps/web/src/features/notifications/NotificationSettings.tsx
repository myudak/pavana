import { useState } from 'react';
import { useCopy } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { cn } from '@/lib/utils';

/** Opt-in switch + "send an example" for the demo browser notifications. */
export function NotificationSettings({ className }: { className?: string }) {
  const t = useCopy();
  const a = t.alerts;
  const { permission, enabled, enable, disable, send } = useNotifications();
  const [status, setStatus] = useState<string | null>(null);

  const toggle = async () => {
    setStatus(null);
    if (enabled) return disable();
    const result = await enable();
    if (result === 'granted') {
      const ok = await send({ title: a.confirmTitle, body: a.confirmBody, tag: 'pavana-confirm' });
      if (!ok) setStatus(a.sendFailed);
    }
  };

  const sendTest = async () => {
    const ok = await send({ title: a.testTitle, body: a.testBody, tag: 'pavana-test' });
    setStatus(ok ? a.testSent : a.sendFailed);
  };

  const hint =
    permission === 'unsupported' ? a.unsupported : permission === 'denied' ? a.denied : null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-foreground/5 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{enabled ? a.enabled : a.enable}</p>
          <p className="text-xs text-muted-foreground">{a.demoNote}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={a.enable}
          disabled={permission === 'unsupported' || permission === 'denied'}
          onClick={() => void toggle()}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40',
            enabled ? 'bg-primary' : 'bg-foreground/20',
          )}
        >
          <span
            className={cn(
              'absolute top-1 size-5 rounded-full bg-white shadow transition-[left]',
              enabled ? 'left-6' : 'left-1',
            )}
          />
        </button>
      </div>
      {enabled && (
        <button
          type="button"
          onClick={() => void sendTest()}
          className="h-9 rounded-full bg-foreground/5 px-4 text-[13px] font-medium ring-1 ring-border hover:bg-foreground/10"
        >
          {a.test}
        </button>
      )}
      {(hint ?? status) && (
        <p role="status" className="text-xs text-muted-foreground">
          {hint ?? status}
        </p>
      )}
    </div>
  );
}
