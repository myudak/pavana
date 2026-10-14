import { z } from 'zod';

/** UTC ISO-8601 timestamp, e.g. `2026-09-15T06:00:00Z`. Always persist UTC; convert for display only. */
export const IsoDateTime = z.iso.datetime({ offset: true });

/**
 * What kind of datum this is. Never blur these:
 * - `observation`: measured (station, satellite detection)
 * - `forecast`: model output for a future/valid time
 * - `derived`: computed by Pavana from other inputs (e.g. upwind indicator)
 * - `fixture`: synthetic/demo data shipped in the repo
 */
export const ProvenanceKind = z.enum(['observation', 'forecast', 'derived', 'fixture']);
export type ProvenanceKind = z.infer<typeof ProvenanceKind>;

export const ProvenanceSchema = z.object({
  /** Upstream provider id, e.g. `open-meteo-air-quality`, `nasa-firms`, `pavana-fixture`. */
  provider: z.string().min(1),
  kind: ProvenanceKind,
  /** When Pavana fetched/loaded it. */
  fetchedAt: IsoDateTime,
  /** When the upstream issued it (forecast run time). Optional for observations. */
  issuedAt: IsoDateTime.optional(),
  /** The time the value is valid for. */
  validAt: IsoDateTime,
  isDemo: z.boolean(),
  spatialResolutionKm: z.number().positive().optional(),
  notes: z.string().optional(),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;
