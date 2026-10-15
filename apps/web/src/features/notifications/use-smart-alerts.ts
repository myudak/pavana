import {
  deriveNotifications,
  factorNumber,
  type NotificationId,
  type NotificationPriority,
} from '@/features/insights/insight-derive';
import { formatNumber } from '@/lib/format';
import { useCopy } from '@/lib/i18n';
import { useConditions, useInsights } from '@/lib/queries';

export interface SmartAlert {
  id: Exclude<NotificationId, 'official'>;
  priority: NotificationPriority;
  title: string;
  body: string;
  /** Time the alert's data refers to (detection time for hotspots). */
  validAt: string;
  isDemo: boolean;
}

/**
 * Smart alerts for the active location, from the same deterministic rules as the
 * Prakiraan notifications (`deriveNotifications`). The curated official-links entry
 * is left out: it is a link list, not something to notify about.
 */
export function useSmartAlerts() {
  const t = useCopy();
  const n = t.insights.notif;
  const conditions = useConditions();
  const insights = useInsights();
  const c = conditions.data;

  if (!c) return { alerts: [] as SmartAlert[], location: null, ready: false };

  const hotspot = insights.data?.factors.find((f) => f.id === 'upwind_hotspots');
  const hotspotCount = factorNumber(hotspot, 'consideredCount');
  const contributing = factorNumber(hotspot, 'contributingCount');
  const aqAt = c.airQuality.provenance.validAt;
  const hotspotAt = hotspot?.provenance[0]?.validAt ?? aqAt;
  const isDemo = c.state === 'demo' || c.airQuality.provenance.isDemo;

  const copy: Record<SmartAlert['id'], { title: string; body: string; at: string }> = {
    combined: { title: n.combinedTitle, body: n.combinedBody, at: aqAt },
    'pm25-rise': { title: n.pm25RiseTitle, body: n.pm25Body, at: aqAt },
    hotspots: {
      title: n.hotspotTitle,
      body: n.hotspotBody(hotspotCount === null ? '—' : formatNumber(hotspotCount)),
      at: hotspotAt,
    },
    'data-stale': { title: n.staleTitle, body: n.staleBody, at: aqAt },
    'data-insufficient': { title: n.insufficientTitle, body: n.insufficientBody, at: aqAt },
  };

  const alerts = deriveNotifications({
    trend: c.trend,
    hotspotCount,
    windRelevant: contributing !== null && contributing > 0,
    state: c.state,
  })
    .filter(
      (x): x is { id: SmartAlert['id']; priority: NotificationPriority } => x.id !== 'official',
    )
    .map(({ id, priority }) => ({
      id,
      priority,
      title: copy[id].title,
      body: copy[id].body,
      validAt: copy[id].at,
      isDemo,
    }));

  // Insights still loading: don't present a partial list as complete.
  return { alerts, location: c.location, ready: !insights.isPending };
}
