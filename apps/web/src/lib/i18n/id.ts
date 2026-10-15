/**
 * Bahasa Indonesia copy (default). Keep ALL user-facing strings here so an English
 * dictionary can be added later with the same shape.
 *
 * Wording rules: no certainty we don't have ("asap akan tiba pukul 16.00"), no "aman",
 * no evacuation instructions. Hotspot ≠ confirmed fire. PM2.5 ≠ "asap kebakaran".
 */
import type {
  DataState,
  FactorId,
  FactorSignal,
  ProvenanceKind,
  Trend,
  UsAqiCategory,
} from '@pavana/shared';
import type { InfoFilter } from '@/features/info/info-derive';
import type {
  NotificationId,
  NotificationPriority,
  RecommendationRule,
} from '@/features/insights/insight-derive';

type Compass8Code = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const id = {
  appName: 'pavana',
  tagline: 'Prakiraan kualitas udara & potensi dampak asap, berdasarkan lokasimu.',

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
    methodDeterministic: 'Indikator deterministik — bukan model machine learning.',
    howTitle: 'Bagaimana ini dihitung?',
    howBody: [
      'Titik panas = deteksi anomali panas satelit, bukan konfirmasi kebakaran.',
      'PM2.5 bisa berasal dari kebakaran, kendaraan, dan industri.',
      'Indikator "titik panas searah angin" bersifat pendukung, bukan peluang asap tiba.',
      'Pavana tidak memprediksi penyebaran api dan tidak memberi perintah evakuasi.',
    ],

    // Mata angin 8 arah (dipakai kartu Angin & rekomendasi).
    compass8: {
      N: 'utara',
      NE: 'timur laut',
      E: 'timur',
      SE: 'tenggara',
      S: 'selatan',
      SW: 'barat daya',
      W: 'barat',
      NW: 'barat laut',
    } satisfies Record<Compass8Code, string>,

    // B. Banner peringatan. Hanya judul + satu baris meta + aksi; rentang prakiraan
    // sudah terlihat di grafik, jadi tidak diulang sebagai teks.
    alert: {
      worseningTitle: 'Prakiraan PM2.5 meningkat',
      forecastPending: 'Detail prakiraan belum tersedia.',
      updatedAt: (at: string) => `Diperbarui ${at}`,
      improvingTitle: 'Prakiraan PM2.5 membaik',
      stableTitle: 'Prakiraan PM2.5 relatif stabil',
      unknownTitle: 'Belum cukup data untuk memperkirakan perubahan',
      unknownBody: 'Perubahan belum dapat dinilai dari data yang tersedia.',
      insufficientTitle: 'Data tidak cukup untuk lokasi ini',
      insufficientBody: 'Data kualitas udara belum tersedia untuk lokasi ini.',
      staleTitle: 'Data lama',
      staleBody: 'Angka mungkin sudah tidak mewakili kondisi saat ini.',
      seeMap: 'Lihat di peta',
      officialGuide: 'Panduan & sumber resmi',
    },

    // C. Grafik utama.
    chart: {
      rangesLabel: 'Rentang waktu',
      ranges: {
        24: '24 jam',
        48: '48 jam',
        168: '7 hari',
      } satisfies Record<number, string>,
      legendMeasurement: 'Pengukuran stasiun',
      legendNow: 'Kini',
      dataType: {
        observation: 'Pengukuran',
        forecast: 'Prakiraan',
        derived: 'Estimasi',
        fixture: 'Estimasi ilustratif',
      } satisfies Record<ProvenanceKind, string>,
      illustrativeTag: 'Data ilustratif',
      tooltipType: 'Jenis data',
      statsMin: 'Min',
      statsAvg: 'Rata-rata',
      statsPeak: 'Puncak',
      empty: 'Tidak ada data PM2.5 untuk rentang ini.',
      srLabel: (n: number) => `Grafik prakiraan PM2.5 dengan ${n} titik data`,
    },

    // D. Tiga indikator inti.
    cards: {
      airTitle: 'Kualitas udara',
      windTitle: 'Angin',
      hotspotTitle: 'Hotspot',
      windFrom: (name: string, code: string) => `Dari ${name} (${code})`,
      windSpeed: (kmh: string) => `${kmh} km/jam`,
      windScope: 'Konteks sebaran asap',
      windRelevance: 'Konteks arah sebaran asap — bukan bukti asap akan mencapai lokasi Anda.',
      windMissing: 'Data angin tidak tersedia untuk lokasi ini.',
      hotspotScope: (radius: string, window: string) =>
        `Dalam radius ${radius} km · ${window} jam terakhir`,
      hotspotScopeArea: 'Area pencarian di sekitar lokasi terpilih.',
      hotspotNone: 'Tidak ada deteksi di area pencarian — bukan berarti tidak ada kebakaran.',
      hotspotError: 'Jumlah titik panas tidak dapat dimuat.',
      seeChart: 'Lihat grafik',
      seeMap: 'Lihat di peta',
    },

    // E. Panel notifikasi.
    notif: {
      title: 'Notifikasi',
      subtitle: 'Yang perlu Anda perhatikan.',
      priority: {
        attention: 'Perlu perhatian',
        watch: 'Pantau',
        info: 'Info resmi',
      } satisfies Record<NotificationPriority, string>,
      note: 'Bukan peringatan resmi · dirangkum dari data halaman.',
      pm25RiseTitle: 'Prakiraan PM2.5 meningkat',
      pm25Body: 'PM2.5 diperkirakan meningkat.',
      combinedBody: 'PM2.5 meningkat bersamaan dengan deteksi titik panas searah angin.',
      staleBody: 'Angka terakhir belum mencerminkan kondisi saat ini.',
      insufficientBody: 'Perubahan kualitas udara belum dapat dinilai.',
      hotspotTitle: 'Titik panas terdeteksi di sekitar wilayah',
      hotspotBody: (n: string) => `${n} deteksi satelit — indikasi titik panas, bukan kebakaran.`,
      officialTitle: 'Informasi resmi karhutla',
      officialBody: 'Kanal resmi status karhutla & kualitas udara.',
      officialError: 'Tautan resmi tidak dapat dimuat.',
      validTime: 'Berlaku',
      detectTime: 'Deteksi',
      combinedTitle: 'Potensi dampak asap meningkat',
      staleTitle: 'Data belum diperbarui',
      insufficientTitle: 'Data kualitas udara belum tersedia',
    },

    // Rekomendasi tindakan — aturan deterministik, satu bundel copy per notifikasi.
    rec: {
      open: 'Lihat rekomendasi',
      illustrativeNote: 'Data ilustratif — bukan pengamatan nyata.',
      rules: {
        combined: {
          trigger: (v) =>
            `PM2.5 naik${v.peakAt ? ` (puncak ~${v.peakAt})` : ''}, ${v.hotspotCount} deteksi titik panas dalam ${v.radiusKm} km, angin dari ${v.windFrom}.`,
          reason: () => 'Sebagian deteksi berada di arah datangnya angin.',
          actions: [
            'Prioritaskan kewaspadaan terhadap potensi dampak asap.',
            'Kurangi aktivitas luar ruangan bila memburuk.',
            'Pantau prakiraan, peta, dan kanal resmi.',
          ],
          limit:
            'Titik panas bukan konfirmasi kebakaran; angin bukan bukti asap mencapai lokasi Anda.',
        },
        'pm25-rise': {
          trigger: (v) =>
            `PM2.5 naik${v.peakUgM3 ? ` hingga ${v.peakUgM3} µg/m³` : ''}${v.peakAt ? `, puncak ~${v.peakAt}` : ''}.`,
          reason: (v) => `Diperbarui ${v.updatedAt}.`,
          actions: [
            'Kurangi aktivitas luar ruangan (anak, lansia, penderita gangguan pernapasan).',
            'Pakai respirator seperti N95 bila harus keluar.',
            'Tutup pintu dan jendela bila asap mulai masuk.',
          ],
          limit: 'Kenaikan PM2.5 tidak otomatis berasal dari kebakaran tertentu.',
        },
        hotspots: {
          trigger: (v) =>
            `${v.hotspotCount} deteksi satelit dalam ${v.radiusKm} km, ${v.windowHours} jam terakhir.`,
          reason: (v) => (v.detectionAt ? `Deteksi terakhir ${v.detectionAt}.` : 'Indikator awal.'),
          actions: [
            'Pantau perkembangan pada halaman Peta.',
            'Cek kanal resmi setempat (BMKG, BPBD, SiPongi).',
          ],
          limit: 'Tidak adanya deteksi bukan berarti tidak ada kebakaran.',
        },
        official: {
          trigger: () => 'Tautan ke sumber resmi karhutla.',
          reason: () => 'Pavana tidak menerbitkan peringatan resmi.',
          actions: [
            'Ikuti arahan otoritas; evakuasi hanya bila diperintahkan.',
          ],
          limit: 'Belum terhubung ke feed pengumuman resmi.',
        },
        'data-stale': {
          trigger: (v) => `Data terakhir diperbarui ${v.updatedAt}.`,
          reason: () => 'Angka lama bisa berbeda dari kondisi saat ini.',
          actions: [
            'Cek sumber resmi (BMKG, BPBD, SiPongi).',
            'Muat ulang halaman atau pilih lokasi lain.',
          ],
          limit: 'Tren PM2.5 tidak ditampilkan.',
        },
        'data-insufficient': {
          trigger: () => 'Data kualitas udara belum tersedia.',
          reason: () => 'Tanpa data, perubahan tidak dapat dinilai.',
          actions: [
            'Cek sumber informasi resmi.',
            'Jangan menyimpulkan kondisi aman.',
          ],
          limit: 'Angka PM2.5 tidak ditampilkan.',
        },
      } satisfies Record<NotificationId, RecommendationRule>,
    },
  },

  info: {
    title: 'Info',
    subtitle: 'Ringkasan data, sumber resmi, dan status pemantauan.',
    linksTitle: 'Sumber resmi',
    aboutTitle: 'Tentang Pavana',
    aboutBody:
      'Pavana menerjemahkan data satelit, cuaca, dan prakiraan kualitas udara menjadi informasi yang mudah dipahami untuk lokasimu. Pavana bukan sumber peringatan resmi.',
    theme: 'Tema',
    themeOptions: { light: 'Terang', dark: 'Gelap', system: 'Sistem' },
    themeToggle: {
      toDark: 'Aktifkan mode gelap',
      toLight: 'Aktifkan mode terang',
    },

    // Dashboard Info: filter kategori + kartu ringkas.
    filtersLabel: 'Filter kategori',
    locationLabel: 'Lokasi',
    filters: {
      all: 'Semua',
      pm25: 'Kualitas udara',
      hotspots: 'Titik panas',
      official: 'Sumber resmi',
      data: 'Status data',
    } satisfies Record<InfoFilter, string>,
    staleWarning: 'Data terlambat — angka mungkin belum mencerminkan kondisi saat ini.',
    noResults: 'Tidak ada kartu untuk filter ini.',
    cards: {
      pm25Title: 'Prakiraan PM2.5',
      pm25Body: (peak: string, at: string) => `Puncak ${peak} µg/m³ sekitar pukul ${at}.`,
      pm25Empty: 'Prakiraan belum tersedia untuk lokasi ini.',
      pm25Action: 'Lihat grafik',
      hotspotTitle: 'Deteksi titik panas',
      hotspotBody: (n: string, radius: string, window: string) =>
        `${n} deteksi dalam radius ${radius} km, ${window} jam terakhir.`,
      hotspotNone: 'Tidak ada deteksi di area pencarian.',
      hotspotUnknown: 'Jumlah deteksi belum tersedia.',
      hotspotAction: 'Lihat di Peta',
      hotspotCaveat: 'Deteksi satelit — bukan konfirmasi kebakaran.',
      officialTitle: 'Informasi resmi BPBD/BMKG',
      officialBody: (n: string) => `${n} kanal resmi terkurasi untuk karhutla dan kualitas udara.`,
      officialEmpty: 'Daftar tautan resmi belum dapat dimuat.',
      officialAction: 'Buka kanal',
      officialAll: 'Semua tautan',
      officialCaveat: 'Pavana bukan sumber peringatan resmi.',
      dataTitle: 'Status data',
      dataUpdated: (at: string) => `Diperbarui ${at}`,
      dataStale: 'Data terlambat — jangan simpulkan kondisi aman.',
      dataInsufficient: 'Data belum cukup untuk menilai kondisi.',
      dataUnknown: 'Status data belum tersedia.',
      dataAction: 'Muat ulang',
    },
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
