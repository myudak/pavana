/**
 * Pure derivation helpers for the Insight page — range availability, series
 * roles, banner tone and notification ids. No React, no fetch: everything here
 * is unit-tested in `insight-derive.test.ts`.
 */
import type { DataState, Factor, ForecastHour, ProvenanceKind, Trend } from '@pavana/shared';
import { PRIORITY_RANK, type Priority } from '@/lib/priorities';

/** Numeric metric from a factor, or null when absent/not a number. */
export function factorNumber(factor: Factor | undefined, key: string): number | null {
  const v = factor?.metrics[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export type Compass8Code = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const COMPASS_8: readonly Compass8Code[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Meteorological FROM-bearing (degrees) → 8-point compass code. */
export function bearingToCompass8(bearingDeg: number): Compass8Code {
  const norm = ((bearingDeg % 360) + 360) % 360;
  return COMPASS_8[Math.round(norm / 45) % 8] ?? 'N';
}

/** Chart range options in hours. A range is offered only if its data exists. */
export const CHART_RANGES = [24, 48, 168] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

/** Coverage of the fetched series in hours, or null when it is not a usable series. */
export function dataSpanHours(hours: readonly ForecastHour[]): number | null {
  const first = hours[0]?.validAt;
  const last = hours[hours.length - 1]?.validAt;
  if (!first || !last) return null;
  const firstMs = Date.parse(first);
  const lastMs = Date.parse(last);
  if (!Number.isFinite(firstMs) || !Number.isFinite(lastMs) || lastMs < firstMs) return null;
  return (lastMs - firstMs) / 3_600_000;
}

/**
 * Which of CHART_RANGES the fetched data actually covers. Endpoints are
 * inclusive (24 hourly points span 24h), hence the `- 1` slack.
 */
export function availableRanges(hours: readonly ForecastHour[]): ChartRange[] {
  const span = dataSpanHours(hours);
  if (span === null) return [];
  return CHART_RANGES.filter((r) => span >= r - 1);
}

/** Keep only points within `rangeH` of the first point. */
export function sliceRange(
  hours: readonly ForecastHour[],
  rangeH: number,
): readonly ForecastHour[] {
  const first = hours[0]?.validAt;
  if (!first) return hours;
  const end = Date.parse(first) + rangeH * 3_600_000;
  return hours.filter((h) => Date.parse(h.validAt) <= end);
}

/** Observation → plotted as a station measurement; everything else → model output. */
export type SeriesRole = 'measurement' | 'model';

export function seriesRole(kind: ProvenanceKind): SeriesRole {
  return kind === 'observation' ? 'measurement' : 'model';
}

/** Most frequent provenance kind within a role — labels legend/tooltip honestly. */
export function dominantKind(
  hours: readonly ForecastHour[],
  role: SeriesRole,
): ProvenanceKind | null {
  const counts = new Map<ProvenanceKind, number>();
  for (const h of hours) {
    const kind = h.airQuality.provenance.kind;
    if (seriesRole(kind) !== role) continue;
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  let best: ProvenanceKind | null = null;
  let bestCount = 0;
  for (const [kind, count] of counts) {
    if (count > bestCount) {
      best = kind;
      bestCount = count;
    }
  }
  return best;
}

/** Highest non-null PM2.5 in the series (never invents a value). */
export function peakOf(
  hours: readonly ForecastHour[],
): { pm25UgM3: number; validAt: string } | null {
  let best: { pm25UgM3: number; validAt: string } | null = null;
  for (const h of hours) {
    const v = h.airQuality.pm25UgM3;
    if (v !== null && (best === null || v > best.pm25UgM3)) {
      best = { pm25UgM3: v, validAt: h.validAt };
    }
  }
  return best;
}

/** True when at least one point carries a PM2.5 value (else the chart is empty). */
export function hasPm25Data(hours: readonly ForecastHour[]): boolean {
  return hours.some((h) => h.airQuality.pm25UgM3 !== null);
}

/** Compact numeric summary of the displayed series — no values invented. */
export interface Pm25Summary {
  min: number;
  avg: number;
  peak: { pm25UgM3: number; validAt: string };
  count: number;
}

export function summarizePm25(hours: readonly ForecastHour[]): Pm25Summary | null {
  const values = hours
    .map((h) => ({ v: h.airQuality.pm25UgM3, at: h.validAt }))
    .filter((x): x is { v: number; at: string } => x.v !== null);
  if (values.length === 0) return null;
  const peak = values.reduce((best, x) => (x.v > best.v ? x : best), values[0]!);
  const min = values.reduce((best, x) => (x.v < best.v ? x : best), values[0]!);
  const sum = values.reduce((acc, x) => acc + x.v, 0);
  return {
    min: min.v,
    avg: sum / values.length,
    peak: { pm25UgM3: peak.v, validAt: peak.at },
    count: values.length,
  };
}

/**
 * Banner tone: amber only for a worsening forecast or bad/stale data.
 * `insufficient` stays neutral — it must never read as a warning *or* as "safe".
 */
export type BannerTone = 'warning' | 'neutral';

export function bannerTone(trend: Trend, state: DataState): BannerTone {
  if (state === 'stale' || state === 'error') return 'warning';
  if (state === 'insufficient') return 'neutral';
  return trend === 'worsening' ? 'warning' : 'neutral';
}

/** Notification priority tiers rendered as badges on the panel. */
export type NotificationPriority = Priority;

export type NotificationId =
  | 'combined'
  | 'pm25-rise'
  | 'hotspots'
  | 'official'
  | 'data-stale'
  | 'data-insufficient';

export interface InsightNotification {
  id: NotificationId;
  priority: NotificationPriority;
}

const PRIORITY: Record<NotificationId, NotificationPriority> = {
  combined: 'attention',
  'pm25-rise': 'attention',
  hotspots: 'watch',
  'data-stale': 'attention',
  'data-insufficient': 'watch',
  official: 'info',
};

const RANK = PRIORITY_RANK;

/** Values interpolated into recommendation copy (already formatted for display). */
export interface RecommendationVars {
  peakUgM3: string;
  peakAt: string;
  hotspotCount: string;
  radiusKm: string;
  windowHours: string;
  windFrom: string;
  detectionAt: string;
  updatedAt: string;
}

/** Copy bundle for one deterministic recommendation rule (see lib/i18n/id.ts). */
export interface RecommendationRule {
  trigger: (vars: RecommendationVars) => string;
  reason: (vars: RecommendationVars) => string;
  actions: string[];
  limit: string;
}

/**
 * Notifications + their recommendation rules, derived from real data only.
 *
 * Deterministic rules:
 * - `combined`        PM2.5 rising AND detections present AND they sit in the wind's
 *                     arrival direction (indicator only, never proof of smoke arrival).
 * - `pm25-rise`       PM2.5 rising without that combination.
 * - `hotspots`        detections inside the insight radius/window (not a fire confirmation).
 * - `data-stale` / `data-insufficient`  no trend is claimed — the user is pointed at
 *                     official sources instead of a "safe" conclusion.
 * - `official`        curated official links; always present, lowest priority.
 *
 * Sorted by priority and capped at three items.
 */
export function deriveNotifications(input: {
  trend: Trend;
  /** Detections within the insight window; null when unknown/failed. */
  hotspotCount: number | null;
  /** True when detections lie in the wind's arrival direction. */
  windRelevant: boolean;
  /** Conditions data state; stale/insufficient replace any trend claim. */
  state: DataState;
}): InsightNotification[] {
  const ids: NotificationId[] = [];
  const limited: NotificationId | null =
    input.state === 'stale'
      ? 'data-stale'
      : input.state === 'insufficient'
        ? 'data-insufficient'
        : null;
  const hasDetections = input.hotspotCount !== null && input.hotspotCount > 0;

  if (limited) {
    ids.push(limited);
  } else if (input.trend === 'worsening') {
    ids.push(hasDetections && input.windRelevant ? 'combined' : 'pm25-rise');
  }
  if (hasDetections) ids.push('hotspots');
  ids.push('official');

  return ids
    .map((id) => ({ id, priority: PRIORITY[id] }))
    .sort((a, b) => RANK[a.priority] - RANK[b.priority])
    .slice(0, 3);
}
