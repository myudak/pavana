/**
 * Open-Meteo adapters — NOT IMPLEMENTED YET (scaffold only).
 *
 * Air quality: https://open-meteo.com/en/docs/air-quality-api  (CAMS-based PM2.5 forecast)
 * Weather:     https://open-meteo.com/en/docs                   (wind, RH, precip)
 *
 * Implementation notes:
 * - Request `timezone=GMT` and convert timestamps to UTC ISO (`...Z`).
 * - Request `wind_speed_unit=ms` (or convert km/h with `kmhToMs`).
 * - `wind_direction_10m` is meteorological "from" degrees — keep it that way here.
 * - Provenance: kind `forecast`, `issuedAt` = model run time if exposed, `spatialResolutionKm`
 *   from the selected model (CAMS global ≈ 40 km — coarse for Indonesia; say so).
 * - CAMS PM2.5 is total PM2.5, not "wildfire smoke". Never label it as fire-caused.
 * - Check attribution & licence terms; cache responses; timeouts + conservative retries.
 */
import { NotImplementedError } from '../../domain/errors';
import type { AirQualityProvider, WeatherProvider } from '../types';

export const openMeteoAirQuality: AirQualityProvider = {
  id: 'open-meteo-air-quality',
  async getHourly() {
    throw new NotImplementedError('Open-Meteo air-quality provider');
  },
};

export const openMeteoWeather: WeatherProvider = {
  id: 'open-meteo-weather',
  async getHourly() {
    throw new NotImplementedError('Open-Meteo weather provider');
  },
};
