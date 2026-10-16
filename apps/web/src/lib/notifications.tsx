import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Browser notifications — DEMO, not finished.
 *
 * What works: the user opts in, the browser asks for permission, and while Pavana is
 * open in this browser the page itself shows a system notification when a smart alert
 * appears (see AlertNotifier). What does NOT exist yet: server-side Web Push, saved
 * locations, scheduling while the app is closed. See docs/backlog.md.
 */
const KEY = 'pavana:notify';
const SW_URL = '/notify-sw.js';

export type NotifyPermission = NotificationPermission | 'unsupported';

export interface NotifyMessage {
  title: string;
  body: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag: string;
  /** In-app path opened when the notification is clicked. */
  url?: string;
}

interface Ctx {
  permission: NotifyPermission;
  /** User opted in AND the browser granted permission. */
  enabled: boolean;
  enable: () => Promise<NotifyPermission>;
  disable: () => void;
  send: (msg: NotifyMessage) => Promise<boolean>;
}

const NotificationsContext = createContext<Ctx | null>(null);

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

function readOptIn(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function writeOptIn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Private mode: the opt-in just won't survive a reload.
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (
      (await navigator.serviceWorker.getRegistration(SW_URL)) ??
      (await navigator.serviceWorker.register(SW_URL))
    );
  } catch {
    return null;
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<NotifyPermission>(() =>
    supported() ? Notification.permission : 'unsupported',
  );
  const [optIn, setOptIn] = useState(readOptIn);

  const send = useCallback(async (msg: NotifyMessage) => {
    if (!supported() || Notification.permission !== 'granted') return false;
    const options: NotificationOptions = {
      body: msg.body,
      tag: msg.tag,
      icon: '/favicon.png',
      data: { url: msg.url ?? '/' },
    };
    // Android Chrome only allows notifications through a service worker.
    const reg = await registration();
    try {
      if (reg) {
        await navigator.serviceWorker.ready;
        await reg.showNotification(msg.title, options);
      } else {
        new Notification(msg.title, options);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const enable = useCallback(async () => {
    if (!supported()) return 'unsupported' as const;
    const result = await Notification.requestPermission();
    setPermission(result);
    const on = result === 'granted';
    setOptIn(on);
    writeOptIn(on);
    if (on) await registration();
    return result;
  }, []);

  const disable = useCallback(() => {
    setOptIn(false);
    writeOptIn(false);
  }, []);

  const value = useMemo<Ctx>(
    () => ({ permission, enabled: optIn && permission === 'granted', enable, disable, send }),
    [permission, optIn, enable, disable, send],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): Ctx {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
