import { z } from 'zod';

export const LatSchema = z.coerce.number().min(-90).max(90);
export const LonSchema = z.coerce.number().min(-180).max(180);

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Province, e.g. "Kalimantan Barat". */
  admin1: z.string(),
  /** Regency/city, optional. */
  admin2: z.string().optional(),
  country: z.literal('ID'),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** IANA zone used for display: Asia/Jakarta (WIB), Asia/Pontianak (WIB), Asia/Makassar (WITA), Asia/Jayapura (WIT). */
  timezone: z.string(),
});
export type Location = z.infer<typeof LocationSchema>;

export const LatLonQuerySchema = z.object({ lat: LatSchema, lon: LonSchema });
export type LatLonQuery = z.infer<typeof LatLonQuerySchema>;

/** [minLon, minLat, maxLon, maxLat] */
const Lon = z.number().min(-180).max(180);
const Lat = z.number().min(-90).max(90);
export const BBoxSchema = z
  .tuple([Lon, Lat, Lon, Lat])
  .refine(([minLon, minLat, maxLon, maxLat]) => minLon < maxLon && minLat < maxLat, {
    message: 'bbox must be [minLon,minLat,maxLon,maxLat] with min < max',
  });
export type BBox = z.infer<typeof BBoxSchema>;
