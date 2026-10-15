/**
 * Bahasa Indonesia copy (default). Keep ALL user-facing strings here so an English
 * dictionary can be added later with the same shape.
 *
 * Wording rules: no certainty we don't have ("asap akan tiba pukul 16.00"), no "aman",
 * no evacuation instructions. Hotspot ≠ confirmed fire. PM2.5 ≠ "asap kebakaran".
 */
import type { DataState, FactorId, FactorSignal, Trend, UsAqiCategory } from '@pavana/shared';

export const id = {
  appName: 'pavana',
  tagline: 'Prakiraan kualitas udara & potensi dampak asap, berdasarkan lokasimu.',

  brand: {
    eyebrow: 'KUALITAS UDARA & TITIK PANAS',
    tagline: 'Pantau udara, bersiap lebih awal.',
  },

  notifications: {
    soon: 'Segera hadir',
  },

  nav: { today: 'Hari Ini', map: 'Peta', insights: 'Insight', info: 'Info' },

  demoBanner: 'Mode Demo · Data ilustratif',
  demoBannerDetail:
    'Semua angka di halaman ini adalah skenario sintetis untuk demonstrasi, bukan pengamatan nyata.',

  dataState: {
    live: 'Terbaru',
    stale: 'Data lama',
    insufficient: 'Data tidak cukup',
    demo: 'Demo',
    error: 'Galat',
  } satisfies Record<DataState, string>,

  trendHeadline: {
    worsening: 'Kualitas udara diperkirakan memburuk',
    improving: 'Kualitas udara diperkirakan membaik',
    stable: 'Kualitas udara diperkirakan relatif stabil',
    unknown: 'Belum cukup data untuk memperkirakan perubahan',
  } satisfies Record<Trend, string>,

  aqCategory: {
    good: 'Baik',
    moderate: 'Sedang',
    unhealthy_sensitive: 'Tidak sehat bagi kelompok sensitif',
    unhealthy: 'Tidak sehat',
    very_unhealthy: 'Sangat tidak sehat',
    hazardous: 'Berbahaya',
    unknown: 'Tidak diketahui',
  } satisfies Record<UsAqiCategory | 'unknown', string>,
  aqiIndicative: 'Kategori indikatif US AQI dari nilai per jam',
  aqiIndicativeShort: 'indikatif',

  provenanceKind: {
    observation: 'Pengamatan',
    forecast: 'Prakiraan',
    derived: 'Turunan',
    fixture: 'Data demo',
  },

  today: {
    currentTitle: 'PM2.5 saat ini',
    heroLead: 'Kualitas udara saat ini',
    pm25Label: 'PM2.5',
    todayForecast: 'Prakiraan hari ini',
    hourlyLabel: 'PRAKIRAAN PER JAM',
    hotspotEyebrow: 'AKTIVITAS TITIK PANAS',
    hotspotCount: (n: number) => `${n} deteksi satelit`,
    hotspotUnavailable: 'Tidak tersedia',
    notEnough: 'Data belum cukup',
    now: 'Kini',
    seeAll: 'Lihat semua',
    unit: 'µg/m³',
    timelineTitle: '24 jam ke depan',
    whyTitle: 'Kenapa bisa berubah?',
    whyMore: 'Lihat penjelasan',
    actionsTitle: 'Yang bisa dilakukan',
    actions: [
      'Pantau pembaruan dari sumber resmi (BMKG, BPBD setempat).',
      'Kurangi aktivitas luar ruangan jika kondisi memburuk, terutama kelompok sensitif.',
    ],
    actionsNote: 'Saran umum, bukan nasihat medis atau perintah evakuasi.',
    // E4: saran per kategori US AQI + rujukan. Umum, tanpa diagnosis dan tanpa perintah
    // evakuasi. Kategori `unknown` (data kosong) sengaja tidak punya saran.
    healthAdvice: {
      good: 'Aktivitas luar ruangan dapat berjalan normal. Tetap pantau pembaruan resmi bila kondisi berubah.',
      moderate:
        'Kelompok sensitif (anak, lansia, penderita asma atau penyakit jantung) disarankan mengurangi aktivitas luar ruangan yang berat.',
      unhealthy_sensitive:
        'Kelompok sensitif disarankan membatasi aktivitas luar ruangan. Gunakan masker bila harus beraktivitas di luar.',
      unhealthy:
        'Batasi aktivitas luar ruangan. Tutup ventilasi bila bau asap tercium dan pantau informasi resmi.',
      very_unhealthy:
        'Hindari aktivitas luar ruangan. Bila harus keluar, gunakan masker dan pantau informasi resmi.',
      hazardous:
        'Tetap di dalam ruangan dan hindari aktivitas luar ruangan. Ikuti arahan otoritas setempat.',
    } satisfies Record<UsAqiCategory, string>,
    healthAdviceSource:
      'Sumber saran: informasi umum dari lembaga resmi — selengkapnya di',
    noData: 'Tidak ada data kualitas udara untuk lokasi ini.',
  },

  factor: {
    title: {
      pm25_trend: 'Tren PM2.5',
      wind: 'Angin',
      upwind_hotspots: 'Titik panas searah angin',
    } satisfies Record<FactorId, string>,
    signal: {
      worsening: 'Berpotensi memperburuk',
      improving: 'Berpotensi membaik',
      neutral: 'Netral',
      unknown: 'Tidak diketahui',
    } satisfies Record<FactorSignal, string>,
    detail: {
      pm25Trend: (current: string, peak: string, peakAt: string | null) =>
        peakAt
          ? `Saat ini ${current} µg/m³; puncak prakiraan ${peak} µg/m³ sekitar pukul ${peakAt}.`
          : `Saat ini ${current} µg/m³.`,
      wind: (from: string, deg: string, speed: string, to: string) =>
        `Dari ${from} (${deg}°), ${speed} m/s — bertiup ke arah ${to}.`,
      upwindNone: (radiusKm: string, windowH: string) =>
        `Tidak ada deteksi titik panas dalam radius ${radiusKm} km selama ${windowH} jam terakhir. Ini tidak berarti tidak ada api.`,
      upwind: (contributing: string, considered: string, radiusKm: string, score: string) =>
        `${contributing} dari ${considered} deteksi dalam radius ${radiusKm} km berada di arah datangnya angin (skor indikator ${score}).`,
      missing: 'Data tidak tersedia.',
    },
  },

  map: {
    title: 'Peta',
    openFull: 'Buka peta',
    closeDetail: 'Tutup detail',
    layerDensity: 'Kepadatan hotspot',
    layerWind: 'Angin',
    legendDensity: 'Kepadatan deteksi satelit — bukan konsentrasi PM2.5',
    noDetectionNote: 'Biru redup berarti tidak ada deteksi, bukan berarti udara bersih.',
    fitKalimantan: 'Seluruh Kalimantan',
    windFieldNote:
      'Garis aliran digambar dari prakiraan angin per grid (demo: ilustrasi sintetis).',
    layerHotspots: 'Titik panas',
    legendHotspot: 'Deteksi anomali panas satelit',
    legendLocation: 'Lokasi dipilih',
    hotspotDisclaimer: 'Deteksi satelit, bukan konfirmasi kebakaran atau batas area terbakar.',
    acquired: 'Waktu deteksi',
    frp: 'FRP',
    confidence: 'Keyakinan',
    satellite: 'Satelit',
    windNow: 'Angin sekarang',
    windFrom: 'dari',
    windTo: 'bertiup ke',
    mapError: 'Peta tidak dapat dimuat. Menampilkan daftar titik panas.',
    count: (n: number) => `${n} deteksi dalam area`,
  },

  insights: {
    title: 'Insight',
    chartTitle: 'Prakiraan PM2.5',
    nowMarker: 'Kini',
    factorsTitle: 'Faktor',
    methodTitle: 'Metode',
    methodDeterministic:
      'Indikator deterministik — bukan model machine learning. Belum ada model terlatih dan tervalidasi.',
    howTitle: 'Bagaimana ini dihitung?',
    howBody: [
      'Titik panas (hotspot) adalah deteksi anomali panas oleh satelit. Itu bukan konfirmasi kebakaran, dan ketiadaan deteksi tidak berarti tidak ada api.',
      'PM2.5 adalah partikel halus dari berbagai sumber (kebakaran, kendaraan, industri). Kenaikan PM2.5 tidak otomatis disebabkan oleh kebakaran tertentu.',
      'Indikator "titik panas searah angin" menjumlahkan deteksi yang berada di arah datangnya angin, diberi bobot jarak, intensitas (FRP), dan umur deteksi. Ini indikator pendukung, bukan peluang asap tiba.',
      'Pavana tidak memprediksi penyebaran api dan tidak memberikan perintah evakuasi. Ikuti arahan otoritas setempat.',
    ],
  },

  info: {
    title: 'Info',
    linksTitle: 'Sumber resmi',
    aboutTitle: 'Tentang Pavana',
    aboutBody:
      'Pavana menerjemahkan data satelit, cuaca, dan prakiraan kualitas udara menjadi informasi yang mudah dipahami untuk lokasimu. Pavana bukan sumber peringatan resmi.',
    theme: 'Tema',
    themeOptions: { light: 'Terang', dark: 'Gelap', system: 'Sistem' },
  },

  location: {
    placeholder: 'Cari lokasi…',
    useMyLocation: 'Gunakan lokasi saya',
    myLocation: 'Lokasi saya',
    geoDenied: 'Izin lokasi ditolak.',
    noResults: 'Tidak ada hasil.',
  },

  common: {
    loading: 'Memuat…',
    retry: 'Coba lagi',
    errorTitle: 'Gagal memuat data',
    notImplemented: 'Sumber data langsung belum tersedia. Jalankan API dalam mode demo.',
    source: 'Sumber',
    validAt: 'berlaku',
  },
} as const;

export type Copy = typeof id;
