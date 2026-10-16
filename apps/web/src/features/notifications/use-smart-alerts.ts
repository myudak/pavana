import type { OfficialLink } from '@pavana/shared';
import {
  bearingToCompass8,
  deriveNotifications,
  factorNumber,
  peakOf,
  type NotificationId,
  type NotificationPriority,
  type RecommendationVars,
} from '@/features/insights/insight-derive';
import { formatDateTime, formatNumber, formatTime, tzAbbr } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions, useForecast, useInsights, useOfficialLinks } from '@/lib/queries';

export interface SmartAlert {
  id: NotificationId;
  priority: NotificationPriority;
  title: string;
  body: string;
  /** Time the alert's data refers to (detection time for hotspots). */
  validAt: string;
  isDemo: boolean;
}

/** Curated link ids surfaced first on the official entry (ids come from the API list). */
const OFFICIAL_FIRST = ['sipongi', 'bmkg-spartan'];
const OFFICIAL_SHOWN = 2;

/** Keep the curated karhutla links first, then fill from the rest of the list. */
function pickOfficialLinks(links: readonly OfficialLink[]): OfficialLink[] {
  const preferred = OFFICIAL_FIRST.map((id) => links.find((l) => l.id === id)).filter(
    (l): l is OfficialLink => l !== undefined,
  );
  const rest = links.filter((l) => !OFFICIAL_FIRST.includes(l.id));
  return [...preferred, ...rest].slice(0, OFFICIAL_SHOWN);
}

const EMPTY_VARS: RecommendationVars = {
  peakUgM3: '',
  peakAt: '',
  hotspotCount: '',
  radiusKm: '',
  windowHours: '',
  windFrom: '',
  detectionAt: '',
  updatedAt: '',
};

/**
 * Smart alerts for the active location, from the same deterministic rules as the
 * former Prakiraan notifications (`deriveNotifications`) — including the curated
 * official-links entry. Single source for the header bell list.
 */
export function useSmartAlerts() {
  const t = useCopy();
  const n = t.insights.notif;
  const conditions = useConditions();
  const insights = useInsights();
  const forecast = useForecast(48);
  const officialLinks = useOfficialLinks();
  const c = conditions.data;

  if (!c) {
    return {
      alerts: [] as SmartAlert[],
      location: null,
      ready: false,
      vars: EMPTY_VARS,
      shownLinks: [] as OfficialLink[],
      isDemo: false,
    };
  }

  const timeZone = c.location.timezone;
  const hotspot = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
  const windFactor = insights.data?.factors.find((f) => f.id === 'wind');
  const hotspotCount = factorNumber(hotspot, 'consideredCount');
  const contributing = factorNumber(hotspot, 'contributingCount');
  const radiusKm = factorNumber(hotspot, 'radiusKm');
  const windowHours = factorNumber(hotspot, 'windowHours');
  const windFromDeg = factorNumber(windFactor, 'directionFromDeg');
  const detectionAt = hotspot?.provenance[0]?.validAt ?? null;
  const aqAt = c.airQuality.provenance.validAt;
  const hotspotAt = hotspot?.provenance[0]?.validAt ?? aqAt;
  const isDemo = c.state === 'demo' || c.airQuality.provenance.isDemo;

  const links = officialLinks.data?.links ?? [];
  const shownLinks = pickOfficialLinks(links);
  const officialFailed = officialLinks.isError || shownLinks.length === 0;

  const peak = peakOf(forecast.data?.hours ?? []);
  const windFrom = (() => {
    if (windFromDeg === null) return '';
    const code = bearingToCompass8(windFromDeg);
    return `${t.insights.compass8[code]} (${code})`;
  })();

  const vars: RecommendationVars = {
    peakUgM3: peak ? formatNumber(peak.pm25UgM3, 1) : '',
    peakAt: peak ? `${formatTime(peak.validAt, timeZone)} ${tzAbbr(timeZone)}` : '',
    hotspotCount: hotspotCount !== null ? formatNumber(hotspotCount) : '',
    radiusKm: radiusKm !== null ? formatNumber(radiusKm) : '',
    windowHours: windowHours !== null ? formatNumber(windowHours) : '',
    windFrom,
    detectionAt: detectionAt ? formatDateTime(detectionAt, timeZone) : '',
    updatedAt: formatDateTime(aqAt, timeZone),
  };

  const copy: Record<NotificationId, { title: string; body: string; at: string }> = {
    combined: { title: n.combinedTitle, body: n.combinedBody, at: aqAt },
    'pm25-rise': { title: n.pm25RiseTitle, body: n.pm25Body, at: aqAt },
    hotspots: {
      title: n.hotspotTitle,
      body: n.hotspotBody(hotspotCount === null ? '—' : formatNumber(hotspotCount)),
      at: hotspotAt,
    },
    official: {
      title: n.officialTitle,
      body: officialFailed ? n.officialError : n.officialBody,
      at: aqAt,
    },
    'data-stale': { title: n.staleTitle, body: n.staleBody, at: aqAt },
    'data-insufficient': { title: n.insufficientTitle, body: n.insufficientBody, at: aqAt },
  };

  const alerts = deriveNotifications({
    trend: c.trend,
    hotspotCount,
    windRelevant: contributing !== null && contributing > 0,
    state: c.state,
  }).map(({ id, priority }) => ({
    id,
    priority,
    title: copy[id].title,
    body: copy[id].body,
    validAt: copy[id].at,
    isDemo,
  }));

  // Insights still loading: don't present a partial list as complete.
  return { alerts, location: c.location, ready: !insights.isPending, vars, shownLinks, isDemo };
}
