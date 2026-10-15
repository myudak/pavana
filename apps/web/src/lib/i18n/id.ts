/**
 * Bahasa Indonesia copy (default). Keep ALL user-facing strings here so an English
 * dictionary can be added later with the same shape.
 *
 * Wording rules: no certainty we don't have ("asap akan tiba pukul 16.00"), no "aman",
 * no evacuation instructions. Hotspot ≠ confirmed fire. PM2.5 ≠ "asap kebakaran".
 */
import type {
  DataState,
  ExposureLevel,
  FactorId,
  FactorSignal,
  Trend,
  UsAqiCategory,
} from '@pavana/shared';

export const id = {
  appName: 'pavana',
  tagline: 'Prakiraan kualitas udara & potensi dampak asap, berdasarkan lokasimu.',

  nav: { today: 'Beranda', map: 'Peta', forecast: 'Prakiraan', info: 'Info' },

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
    healthAdviceSource: 'Sumber saran: informasi umum dari lembaga resmi — selengkapnya di',
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
        `Dari ${from} (${deg}°), ${speed} km/j — bertiup ke arah ${to}.`,
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
    creditLive: 'Sumber: titik panas NASA FIRMS (VIIRS, 48 jam terakhir) · angin Open-Meteo.',
    creditDemo: 'Sumber: skenario demo Pavana — titik panas dan angin ilustratif.',
    acquired: 'Waktu deteksi',
    frp: 'FRP',
    confidence: 'Keyakinan',
    satellite: 'Satelit',
    windNow: 'Angin sekarang',
    windFrom: 'dari',
    windTo: 'bertiup ke',
    mapError: 'Peta tidak dapat dimuat. Menampilkan daftar titik panas.',
    layersLabel: 'Lapisan peta',
    layerPlumes: 'Arah asap',
    plumesTitle: 'Arah sebaran asap',
    plumesHours: (h: number) => (h === 0 ? 'Kini' : `+${h} jam`),
    plumesFrom: 'Titik panas',
    plumesNote:
      'Garis mengikuti prakiraan angin dari tiap titik panas — indikatif, bukan model sebaran asap dan bukan konsentrasi.',
    viewLocal: 'Sekitarku',
    viewRegion: 'Kalimantan',
    detailTitle: 'Detail deteksi',
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

  // "Will the smoke reach me?" — a POTENTIAL level, never a probability or a certainty.
  exposure: {
    eyebrow: 'Apakah asap akan sampai ke sini?',
    level: {
      none: 'Minim',
      low: 'Rendah',
      moderate: 'Sedang',
      high: 'Tinggi',
      unknown: 'Tidak diketahui',
    } satisfies Record<ExposureLevel, string>,
    headline: {
      none: 'Potensi paparan asap minim',
      low: 'Potensi paparan asap rendah',
      moderate: 'Potensi paparan asap sedang',
      high: 'Potensi paparan asap tinggi',
      unknown: 'Belum cukup data untuk menilai asap',
    } satisfies Record<ExposureLevel, string>,
    peakAt: (time: string) => `Paling tinggi sekitar pukul ${time}`,
    firstElevatedAt: (time: string) => `mulai meningkat sekitar ${time}`,
    driver: {
      pm25: 'Berdasarkan prakiraan PM2.5.',
      upwind: 'Angin datang dari arah titik panas di sekitarmu.',
      both: 'Prakiraan PM2.5 tinggi dan angin datang dari arah titik panas.',
      none: 'Tidak ada sinyal kuat dari PM2.5 maupun arah angin.',
    },
    potentialLabel: 'Potensi paparan',
    disclaimer:
      'Indikator potensi dari prakiraan PM2.5 dan arah angin terhadap titik panas — bukan peluang, bukan kepastian. Ambang belum dikalibrasi terhadap pengamatan.',
    timelineTitle: 'Garis waktu asap',
    timelineHint: 'Geser untuk melihat jam lain',
    stepNow: 'Kini',
    stepHours: (h: number) => `+${h} jam`,
    upwindCount: (n: number, total: number) =>
      total === 0 ? 'Tidak ada deteksi di sekitar' : `${n} dari ${total} titik panas searah angin`,
  },

  home: {
    hourlyTitle: 'Prakiraan 24 jam',
    detailsTitle: 'Kondisi sekarang',
    mapTitle: 'Titik panas & angin',
    mapCta: 'Buka peta',
    whyTitle: 'Kenapa begini?',
    whyCta: 'Lihat prakiraan',
    pm25Label: 'PM2.5',
  },

  tiles: {
    wind: 'Angin',
    windFrom: (dir: string) => `Dari ${dir}`,
    windTo: (dir: string) => `bertiup ke ${dir}`,
    humidity: 'Kelembapan',
    temperature: 'Suhu',
    rain: 'Hujan',
    rainNone: 'Tidak ada',
    hotspots: 'Titik panas',
    hotspotsNote: 'searah angin, radius 300 km',
    aqi: 'US AQI',
    aqiNote: 'indikatif, dari PM2.5 per jam',
    missing: 'Tidak ada data',
  },

  // 8-point compass in Indonesian (meteorological FROM / flow TO handled by callers).
  compass: [
    'Utara',
    'Timur Laut',
    'Timur',
    'Tenggara',
    'Selatan',
    'Barat Daya',
    'Barat',
    'Barat Laut',
  ],
  compassShort: { n: 'U', e: 'T', s: 'S', w: 'B' },

  forecast: {
    title: 'Prakiraan',
    tabs: { air: 'Kualitas udara', smoke: 'Asap', weather: 'Cuaca' },
    airTitle: 'PM2.5 per jam',
    smokeTitle: 'Potensi paparan asap per jam',
    weatherTitle: 'Angin per jam',
    factorsTitle: 'Faktor yang berpengaruh',
    modelTitle: 'Model AI prakiraan PM2.5',
    modelStatus: 'Dalam pengembangan',
    modelBody:
      'Model LightGBM dengan fitur titik panas berbasis arah angin sedang dikembangkan dan belum dievaluasi. Angka di sini berasal dari prakiraan PM2.5 dan indikator deterministik, bukan dari model tersebut.',
    windSpeed: 'Kecepatan',
    windLegend: 'Angin dalam km/j · panah = arah angin bertiup',
    temperature: 'Suhu',
    humidity: 'Kelembapan',
  },

  /** Display names for provenance `provider` ids (unknown ids are shown as-is). */
  providerName: {
    'open-meteo': 'Open-Meteo',
    'open-meteo-cams': 'Open-Meteo (CAMS)',
    'nasa-firms': 'NASA FIRMS',
    openaq: 'OpenAQ',
    bmkg: 'BMKG',
  } as Record<string, string>,

  mode: {
    title: 'Mode data',
    live: 'Data langsung',
    demo: 'Demo',
    liveBody:
      'Prakiraan dan pengamatan terbaru dari Open-Meteo (CAMS), NASA FIRMS, OpenAQ, dan BMKG.',
    demoBody: 'Skenario sintetis Kubu Raya (September) untuk demonstrasi. Semua angka ilustratif.',
    exitDemo: 'Lihat data langsung',
  },

  sources: {
    title: 'Sumber data',
    status: {
      ok: 'Aktif',
      error: 'Gangguan',
      not_configured: 'Belum dikonfigurasi',
      fixture: 'Demo',
    },
  },

  station: {
    line: (name: string, value: string, km: string) =>
      `Stasiun terdekat (pengamatan): ${value} µg/m³ · ${name}, ${km} km`,
  },

  hotspotsUnavailable:
    'Data titik panas sedang tidak tersedia — potensi dihitung dari prakiraan PM2.5 saja.',

  reference: {
    title: 'Pembanding: BMKG',
    none: 'Belum ada titik prakiraan BMKG yang tercakup di dekat lokasi ini.',
    note: (place: string) =>
      `Prakiraan 3-jam BMKG untuk ${place}. Ditampilkan apa adanya, tidak dicampur dengan angka Pavana.`,
  },

  alerts: {
    title: 'Peringatan pintar',
    status: 'Belum tersedia',
    body: 'Rencana: notifikasi saat prakiraan di lokasi tersimpanmu memburuk, beserta tautan ke peringatan resmi. Fitur ini belum dibangun.',
  },

  theme: {
    toggle: 'Ganti tema',
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
