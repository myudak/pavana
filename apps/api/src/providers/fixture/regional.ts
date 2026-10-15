import { HotspotSchema, type Hotspot } from '@pavana/shared';
import { z } from 'zod';
import raw from '../../../../../fixtures/regional-kalimantan-hotspots.json' with { type: 'json' };

const RegionalSchema = z.object({
  meta: z.object({
    id: z.string(),
    isDemo: z.literal(true),
    synthetic: z.literal(true),
    referenceTime: z.string(),
  }),
  hotspots: z.array(HotspotSchema),
});

/** Validated at import time — a malformed fixture fails fast at startup and in tests. */
export const regionalHotspots: Hotspot[] = RegionalSchema.parse(raw).hotspots;
