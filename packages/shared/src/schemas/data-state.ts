import { z } from 'zod';

/**
 * Overall freshness/quality state of a response. The UI must render each one
 * distinctly and must never show a "good/safe" label for anything but `live`
 * data that actually says so.
 */
export const DataState = z.enum(['live', 'stale', 'insufficient', 'demo', 'error']);
export type DataState = z.infer<typeof DataState>;
