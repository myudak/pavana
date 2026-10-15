import { ArrowRight01Icon, Gps01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { api } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useSelectedLocation } from './location-context';

/** Location row ("📍 Sungai Raya ›") that opens a bottom sheet with search + opt-in GPS. */
export function LocationPicker({ subtitle, className }: { subtitle?: string; className?: string }) {
  const t = useCopy();
  const { location, setLocation } = useSelectedLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [geoError, setGeoError] = useState<string | null>(null);

  const results = useQuery({
    queryKey: ['locations', q],
    queryFn: ({ signal }) => api.searchLocations(q, signal),
    enabled: open,
  });

  // Geolocation only on explicit user action.
  const useMyLocation = () => {
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          'group -mx-2 flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-left text-sm font-medium hover:bg-foreground/5',
          className,
        )}
      >
        <Icon icon={Location01Icon} className="size-4 text-haze" />
        <span className="truncate">
          {location.label}
          {subtitle && <span className="font-normal text-muted-foreground">, {subtitle}</span>}
        </span>
        <Icon
          icon={ArrowRight01Icon}
          className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] max-w-lg gap-0 rounded-t-3xl border-x-0 p-0 sm:border-x"
      >
        <SheetHeader className="pb-2">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <SheetTitle>{t.location.placeholder.replace('…', '')}</SheetTitle>
          <SheetDescription className="sr-only">{t.location.placeholder}</SheetDescription>
        </SheetHeader>
        <Command shouldFilter={false} className="bg-transparent px-2 pb-4">
          <CommandInput
            value={q}
            onValueChange={setQ}
            placeholder={t.location.placeholder}
            className="text-base"
          />
          <CommandList className="max-h-[50dvh]">
            <CommandGroup>
              <CommandItem onSelect={useMyLocation} className="gap-3 py-3">
                <Icon icon={Gps01Icon} className="size-5 text-primary-strong" />
                {t.location.useMyLocation}
              </CommandItem>
            </CommandGroup>
            {geoError && <p className="px-3 pb-2 text-xs text-state-error">{geoError}</p>}
            <CommandEmpty>
              {results.isPending ? t.common.loading : t.location.noResults}
            </CommandEmpty>
            {results.data && results.data.results.length > 0 && (
              <CommandGroup>
                {results.data.results.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.id}
                    onSelect={() => {
                      setLocation({ lat: r.lat, lon: r.lon, label: r.name });
                      setOpen(false);
                    }}
                    className="gap-3 py-3"
                  >
                    <Icon icon={Location01Icon} className="size-5 text-muted-foreground" />
                    <span>
                      <span className="block font-medium">{r.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[r.admin2, r.admin1].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </SheetContent>
    </Sheet>
  );
}
