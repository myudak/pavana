import type { OfficialLink } from '@pavana/shared';

/**
 * Curated entry points to authoritative sources. These are LINKS, not an alert feed —
 * Pavana does not issue official warnings or evacuation instructions.
 *
 * E5 — terakhir diperiksa 2026-10-15 (permintaan HTTP otomatis):
 * BMKG PM2.5, SPARTAN, SiPongi, NASA FIRMS, BPBD Kalbar → terbuka (HTTP 200).
 * BNPB (https://bnpb.go.id/) → 403 untuk permintaan otomatis (kemungkinan proteksi bot);
 * domain resminya tetap dipertahankan, mohon verifikasi manual di browser.
 */
export const OFFICIAL_LINKS: OfficialLink[] = [
  {
    id: 'bmkg-pm25',
    title: 'Kualitas Udara PM2.5',
    publisher: 'BMKG',
    url: 'https://www.bmkg.go.id/kualitas-udara/pm25',
    description: 'Pemantauan konsentrasi PM2.5 resmi dari BMKG.',
  },
  {
    id: 'bmkg-spartan',
    title: 'SPARTAN: Sistem Peringatan Kebakaran',
    publisher: 'BMKG',
    url: 'https://spartan.bmkg.go.id/',
    description: 'Informasi tingkat kemudahan kebakaran dan sebaran asap dari BMKG.',
  },
  {
    id: 'sipongi',
    title: 'SiPongi: Karhutla Monitoring System',
    publisher: 'Kementerian Kehutanan',
    url: 'https://sipongi.gakkum.kehutanan.go.id/',
    description: 'Status titik panas dan kebakaran hutan & lahan di Indonesia.',
  },
  {
    id: 'nasa-firms',
    title: 'FIRMS Fire Map',
    publisher: 'NASA',
    url: 'https://firms.modaps.eosdis.nasa.gov/map/',
    description: 'Deteksi anomali panas satelit (VIIRS/MODIS). Bukan konfirmasi kebakaran.',
  },
  {
    id: 'bnpb',
    title: 'Informasi Kebencanaan',
    publisher: 'BNPB',
    url: 'https://bnpb.go.id/',
    description: 'Informasi dan arahan resmi penanggulangan bencana.',
  },
  {
    id: 'bpbd-kalbar',
    title: 'BPBD Provinsi Kalimantan Barat',
    publisher: 'BPBD Kalbar',
    url: 'https://bpbd.kalbarprov.go.id/',
    description: 'Informasi penanggulangan bencana daerah, termasuk laporan harian posko karhutla.',
  },
];
