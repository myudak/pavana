/**
 * OpenAQ station observations — NOT IMPLEMENTED YET (scaffold only).
 *
 * Docs: https://api.openaq.org/docs (v3, requires `X-API-Key`).
 * Candidate use: ground-truth PM2.5 for validation / ML training, and an `observation`
 * source for "current" conditions where a nearby station exists.
 * Station coverage in Kalimantan is sparse — handle "no nearby station" as insufficient data.
 */
import { NotImplementedError } from '../../domain/errors';
import type { AirQualityProvider } from '../types';

export function createOpenAqProvider(_apiKey: string | undefined): AirQualityProvider {
  return {
    id: 'openaq',
    async getHourly() {
      throw new NotImplementedError('OpenAQ provider');
    },
  };
}
