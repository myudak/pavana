/**
 * BMKG Data Terbuka forecast points (adm4 = kelurahan/desa code). Curated for
 * smoke-prone cities; each code and coordinate was checked against
 * https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=… on 2026-10-15.
 * Extend this list rather than guessing codes — an unknown code returns 404.
 */
export interface BmkgPoint {
  adm4: string;
  /** City (kota/kabupaten) the point represents. */
  city: string;
  /** BMKG's own village name for the point. */
  desa: string;
  lat: number;
  lon: number;
}

export const BMKG_POINTS: BmkgPoint[] = [
  {
    adm4: '61.71.02.1001',
    city: 'Kota Pontianak',
    desa: 'Paritmayor',
    lat: -0.0538,
    lon: 109.3769,
  },
  { adm4: '61.12.01.2001', city: 'Kubu Raya', desa: 'Sungai Raya', lat: -0.0711, lon: 109.3712 },
  {
    adm4: '62.71.01.1001',
    city: 'Kota Palangka Raya',
    desa: 'Pahandut',
    lat: -2.1997,
    lon: 113.9503,
  },
  { adm4: '63.71.01.1001', city: 'Kota Banjarmasin', desa: 'Mantuil', lat: -3.3565, lon: 114.5469 },
  {
    adm4: '64.72.01.1001',
    city: 'Kota Samarinda',
    desa: 'Rawa Makmur',
    lat: -0.5722,
    lon: 117.1775,
  },
  { adm4: '64.71.01.1001', city: 'Kota Balikpapan', desa: 'Manggar', lat: -1.2144, lon: 116.9377 },
  {
    adm4: '14.71.02.1001',
    city: 'Kota Pekanbaru',
    desa: 'Simpang Empat',
    lat: 0.515,
    lon: 101.4501,
  },
  {
    adm4: '16.71.01.1001',
    city: 'Kota Palembang',
    desa: 'Tiga-puluh-lima Ilir',
    lat: -3.008,
    lon: 104.7436,
  },
  {
    adm4: '15.71.01.1001',
    city: 'Kota Jambi',
    desa: 'Simpang IV Sipin',
    lat: -1.6156,
    lon: 103.5768,
  },
];
