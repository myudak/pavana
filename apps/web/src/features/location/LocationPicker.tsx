import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Crosshair, MapPin, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSelectedLocation } from './location-context';

/**
 * Compact location chip that expands into search + opt-in geolocation.
 * Top-bar pill: transparent, pin + name + chevron, hairline underline.
 */
export function LocationPicker({
  className,
  compact = false,
}: {
  className?: string;
  /** Compact mobile row variant: no border/pil, pink pin, 40px hit area. */
  compact?: boolean;
}) {
  const t = useCopy();
  const { location, setLocation } = useSelectedLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useQuery({
    queryKey: ['locations', q],
    queryFn: ({ signal }) => api.searchLocations(q, signal),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Geolocation only on explicit user action.
  const handleUseMyLocation = () => {
    setGeoError(null);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: t.location.myLocation,
        });
        setOpen(false);
      },
      () => setGeoError(t.location.geoDenied),
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 10_000 },
    );
  };

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={location.label}
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'flex min-h-[2.5rem] items-center gap-1 text-sm font-medium text-ink'
            : 'flex items-center gap-1.5 border-b border-hairline pb-3 text-sm font-medium text-ink hover:text-accent'
        }
      >
        <MapPin className={cn('size-4 shrink-0', compact && 'text-accent-strong')} aria-hidden />
        <span className="max-w-36 truncate">{location.label}</span>
        <ChevronDown className="size-4 shrink-0 text-ink-muted" aria-hidden />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute z-20 mt-2 w-72 space-y-2 rounded-card border border-glass-border bg-surface p-3 shadow-lg dark:bg-[var(--pv-glass)] dark:backdrop-blur-xl left-0 lg:left-auto lg:right-0"
        >
          <label className="flex items-center gap-2 rounded-full border border-border px-3 py-2">
            <Search className="size-4 text-ink-muted" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.location.placeholder}
              aria-label={t.location.placeholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-muted"
            />
          </label>
          <ul className="max-h-60 overflow-auto">
            {results.data?.results.map((r) => (
              <li key={r.id}>
                <button
                  className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-muted"
                  onClick={() => {
                    setLocation({ lat: r.lat, lon: r.lon, label: r.name });
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {[r.admin2, r.admin1].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
            {results.data?.results.length === 0 && (
              <li className="px-2 py-2 text-sm text-ink-muted">{t.location.noResults}</li>
            )}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={handleUseMyLocation}
          >
            <Crosshair aria-hidden /> {t.location.useMyLocation}
          </Button>
          {geoError && <p className="text-xs text-state-error">{geoError}</p>}
        </div>
      )}
    </div>
  );
}
