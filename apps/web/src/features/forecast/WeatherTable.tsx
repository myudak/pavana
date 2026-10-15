import type { ForecastHour } from '@pavana/shared';
import { WindArrow } from '@/components/WindArrow';
import { formatNumber, formatTime } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { msToKmh, windSummary } from '@/lib/wind';

/** Swipeable hourly wind / temperature / humidity columns. Missing values show "—". */
export function WeatherTable({ hours, timeZone }: { hours: ForecastHour[]; timeZone: string }) {
  const t = useCopy();
  return (
    <div className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:-mx-5 sm:px-5" tabIndex={0}>
      <table className="w-max border-separate border-spacing-x-1 text-center text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th
              className="sticky left-0 z-10 bg-transparent pr-2 text-left font-normal"
              scope="col"
            >
              <span className="sr-only">Jam</span>
            </th>
            {hours.map((h, i) => (
              <th key={h.validAt} scope="col" className="min-w-12 pb-2 font-medium">
                {i === 0 ? t.exposure.stepNow : formatTime(h.validAt, timeZone)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_th]:pr-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-normal [&_th]:text-muted-foreground [&_td]:py-1.5">
          <tr>
            <th scope="row">{t.tiles.wind}</th>
            {hours.map((h) => {
              const w = h.weather;
              const s =
                w?.windDirectionFromDeg == null ? null : windSummary(w.windDirectionFromDeg, t);
              return (
                <td key={h.validAt}>
                  {s ? (
                    <span
                      className="inline-flex flex-col items-center gap-0.5"
                      title={t.tiles.windFrom(s.fromName)}
                    >
                      <WindArrow toDeg={s.toDeg} className="text-haze" />
                      <span className="tabular text-xs">
                        {w?.windSpeedMs == null ? '—' : formatNumber(msToKmh(w.windSpeedMs))}
                      </span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <th scope="row">{t.forecast.temperature}</th>
            {hours.map((h) => (
              <td key={h.validAt} className="tabular">
                {h.weather?.temperatureC == null ? '—' : `${formatNumber(h.weather.temperatureC)}°`}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{t.forecast.humidity}</th>
            {hours.map((h) => (
              <td key={h.validAt} className="tabular text-muted-foreground">
                {h.weather?.relativeHumidityPct == null
                  ? '—'
                  : `${formatNumber(h.weather.relativeHumidityPct)}%`}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">{t.forecast.windLegend}</p>
    </div>
  );
}
