import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { setApiDemo } from '@/lib/api';

/**
 * Demo toggle: when on, every API call carries `demo=1` and the server answers from the
 * synthetic Kubu Raya scenario (always labelled as demo). Live data is the default.
 * `?demo=1` / `?demo=0` in the page URL switches it (handy for pitch links).
 */
const KEY = 'pavana:demo';

function initial(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('demo');
    if (param === '1' || param === '0') {
      localStorage.setItem(KEY, param);
      return param === '1';
    }
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

interface Ctx {
  demo: boolean;
  setDemo: (on: boolean) => void;
}

const DemoContext = createContext<Ctx | null>(null);

export function DemoModeProvider({
  children,
  initialDemo,
}: {
  children: ReactNode;
  initialDemo?: boolean;
}) {
  const client = useQueryClient();
  const [demo, setState] = useState(() => {
    const v = initialDemo ?? initial();
    setApiDemo(v);
    return v;
  });
  const setDemo = useCallback(
    (on: boolean) => {
      try {
        localStorage.setItem(KEY, on ? '1' : '0');
      } catch {
        /* storage blocked — the toggle still applies for this session */
      }
      setApiDemo(on);
      setState(on);
      // Drop cached answers from the other mode so nothing mixes.
      void client.resetQueries();
    },
    [client],
  );
  const value = useMemo(() => ({ demo, setDemo }), [demo, setDemo]);
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoMode(): Ctx {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemoMode must be used inside <DemoModeProvider>');
  return ctx;
}
