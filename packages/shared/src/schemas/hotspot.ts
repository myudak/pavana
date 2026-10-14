import { z } from 'zod';
import { IsoDateTime, ProvenanceSchema } from './provenance';

/**
 * A satellite thermal anomaly (e.g. NASA FIRMS VIIRS/MODIS). This is a DETECTION,
 * not a confirmed fire, and not a fire perimeter. Absence of detections ≠ absence of fire.
 */
export const HotspotSchema = z.object({
  id: z.string(),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Satellite acquisition time (UTC). */
  acquiredAt: IsoDateTime,
  /** Fire radiative power in MW, if reported. */
  frpMw: z.number().nonnegative().nullable(),
  confidence: z.enum(['low', 'nominal', 'high']).nullable(),
  satellite: z.string(),
  instrument: z.string(),
  provenance: ProvenanceSchema,
});
export type Hotspot = z.infer<typeof HotspotSchema>;
