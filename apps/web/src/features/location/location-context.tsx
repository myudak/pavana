import type { LatLon } from '@pavana/shared';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SelectedLocation extends LatLon {
  label: string;
}

/** Demo default: Sungai Raya, Kubu Raya (Kalimantan Barat) — matches the fixture scenario. */
export const DEFAULT_LOCATION: SelectedLocation = { lat: -0.1, lon: 109.38, label: 'Sungai Raya' };

const KEY = 'pavana:location';

/** Stored locally only (no account, no server-side storage of user coordinates). */
function read(): SelectedLocation {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LOCATION;
    const v = JSON.parse(raw) as Partial<SelectedLocation>;
    return typeof v.lat === 'number' && typeof v.lon === 'number' && typeof v.label === 'string'
      ? { lat: v.lat, lon: v.lon, label: v.label }
      : DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

interface Ctx {
  location: SelectedLocation;
  setLocation: (l: SelectedLocation) => void;
}

const LocationContext = createContext<Ctx | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setState] = useState<SelectedLocation>(read);
  const setLocation = useCallback((l: SelectedLocation) => {
    // Round to ~1 km before persisting: enough for air quality, avoids storing a doorstep.
    const rounded = {
      ...l,
      lat: Math.round(l.lat * 100) / 100,
      lon: Math.round(l.lon * 100) / 100,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(rounded));
    } catch {
      /* ignore */
    }
    setState(rounded);
  }, []);
  const value = useMemo(() => ({ location, setLocation }), [location, setLocation]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useSelectedLocation(): Ctx {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useSelectedLocation must be used inside <LocationProvider>');
  return ctx;
}
