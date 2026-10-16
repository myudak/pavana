import { useQuery } from '@tanstack/react-query';
import { ProvenanceNote } from '@/components/ProvenanceNote';
import { QueryState } from '@/components/QueryState';
import { WindArrow } from '@/components/WindArrow';
import { Skeleton } from '@/components/ui/skeleton';
import { useSelectedLocation } from '@/features/location/location-context';
import { api } from '@/lib/api';
import { formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { msToKmh, windSummary } from '@/lib/wind';

/** BMKG 3-hourly forecast shown next to (never merged with) Pavana's Open-Meteo numbers. */
export function BmkgReference({ timeZone }: { timeZone: string }) {
  const t = useCopy();
  const { location } = useSelectedLocation();
  const ref = useQuery({
    queryKey: ['weather-reference', location.lat, location.lon],
    queryFn: ({ signal }) => api.weatherReference(location, signal),
  });

  return (
    <div className="mt-5 border-t border-foreground/10 pt-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t.reference.title}
      </p>
      <QueryState
        query={ref}
        inline
        skeleton={<Skeleton className="mt-3 h-20 w-full rounded-2xl" />}
      >
        {(r) =>
          r.hours.length === 0 || !r.place ? (
            <p className="mt-2 text-sm text-muted-foreground">{t.reference.none}</p>
          ) : (
            <>
              <ol className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
                {r.hours.slice(0, 6).map((h) => {
                  const w =
                    h.windDirectionFromDeg === null ? null : windSummary(h.windDirectionFromDeg, t);
                  return (
                    <li
                      key={h.validAt}
                      className="min-w-24 shrink-0 rounded-2xl bg-foreground/5 p-3 text-center text-xs"
                    >
                      <p className="text-muted-foreground">{formatTime(h.validAt, timeZone)}</p>
                      <p className="mt-1 font-heading text-lg font-semibold tabular">
                        {h.temperatureC === null ? '—' : `${formatNumber(h.temperatureC)}°`}
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-1 text-muted-foreground">
                        {w && <WindArrow toDeg={w.toDeg} className="size-3 text-haze" />}
                        {h.windSpeedMs === null ? '—' : formatNumber(msToKmh(h.windSpeedMs))}
                      </p>
                      <p className="mt-1 line-clamp-2 leading-snug">{h.description ?? '—'}</p>
                    </li>
                  );
                })}
              </ol>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                {t.reference.note(r.place)}
              </p>
              {r.provenance && <ProvenanceNote provenance={r.provenance} timeZone={timeZone} />}
            </>
          )
        }
      </QueryState>
    </div>
  );
}
