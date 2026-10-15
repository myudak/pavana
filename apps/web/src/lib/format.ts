/** Display helpers. Data is UTC; always format in the LOCATION's time zone (WIB/WITA/WIT). */

const TZ_ABBR: Record<string, string> = {
  'Asia/Jakarta': 'WIB',
  'Asia/Pontianak': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
};

export const tzAbbr = (timeZone: string) => TZ_ABBR[timeZone] ?? timeZone;

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone: string): string {
  const s = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(new Date(iso));
  return `${s} ${tzAbbr(timeZone)}`;
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(n);
}
/** "15 Sep 10.00 – 16 Sep 10.00 WIB" — one zone abbreviation for the whole range. */
export function formatTimeRange(fromIso: string, toIso: string, timeZone: string): string {
  const dayMonth = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone }).format(
      new Date(iso),
    );
  return `${dayMonth(fromIso)} ${formatTime(fromIso, timeZone)} – ${dayMonth(toIso)} ${formatTime(toIso, timeZone)} ${tzAbbr(timeZone)}`;
}

/** Short weekday (Sen/Sel/…) for a YYYY-MM-DD date in the location zone. */
export function weekdayShort(date: string, timeZone: string): string {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone }).format(
    new Date(`${date}T12:00:00Z`),
  );
}
