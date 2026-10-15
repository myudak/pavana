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

  landing: {
    title: 'Pavana — Weather, Wildfire & Kualitas Udara Indonesia',
    description:
      'Kenali Pavana: cuaca (weather), kualitas udara PM2.5, dan konteks asap kebakaran hutan (wildfire) di Indonesia. Coba demo Kubu Raya dengan data ilustratif.',
    nav: {
      how: 'Cara kerja',
      features: 'Fitur',
      sources: 'Sumber data',
      faq: 'FAQ',
      openApp: 'Buka aplikasi',
    },
    hero: {
      category: 'Weather · Air quality · Wildfire',
      heading: ['Apakah asap kebakaran', 'akan sampai ke tempatmu?'],
      introduction:
        'Pavana dirancang untuk membantu memahami cuaca, kualitas udara PM2.5, dan potensi dampak asap kebakaran hutan dan lahan gambut di Indonesia. Jelajahi hubungan angin, titik panas satelit, dan tren kualitas udara dalam tampilan sesederhana aplikasi cuaca.',
      demoStatus:
        'Aplikasi saat ini menampilkan demo Kubu Raya, Kalimantan Barat dengan data ilustratif. Integrasi data langsung sedang disiapkan.',
      ctaPrimary: 'Buka Pavana',
      ctaDemo: 'Lihat demo',
      mockBadge: 'Contoh · data ilustratif',
    },
    how: {
      eyebrow: 'Cara kerja',
      title: 'Satu jawaban sederhana, dari tiga sinyal.',
      steps: [
        {
          title: 'Pilih lokasi',
          body: 'Cari kota atau kabupaten, atau pakai lokasimu. Pilihan lokasi disimpan di perangkatmu.',
        },
        {
          title: 'Pavana membaca tiga sinyal',
          body: 'Titik panas satelit, prakiraan arah dan kecepatan angin, serta prakiraan PM2.5 untuk 24 jam ke depan.',
        },
        {
          title: 'Jawaban per jam',
          body: 'Potensi paparan asap — minim, rendah, sedang, atau tinggi — lengkap dengan sumber dan waktu berlakunya.',
        },
      ],
      diagramTitle: 'Jarak sama, jawaban berbeda.',
      diagramBody:
        'Dua rumah sama jauhnya dari titik panas. Yang berada di arah tiupan angin berpotensi terpapar asap; yang di sampingnya jauh lebih kecil. Inilah yang dihitung Pavana — sebagai indikator potensi, bukan kepastian.',
      fire: 'Titik panas',
      wind: 'Angin',
      houseA: 'Rumah A · searah angin',
      houseB: 'Rumah B · di samping arah angin',
      levelA: 'Tinggi',
      levelB: 'Rendah',
      sameDistance: 'Lingkaran putus-putus: jarak yang sama dari titik panas.',
    },
    features: {
      eyebrow: 'Fitur',
      title: 'Semudah aplikasi cuaca.',
      status: {
        available: 'Tersedia',
        building: 'Dalam pengembangan',
        planned: 'Belum tersedia',
      },
      items: [
        {
          key: 'reach',
          title: 'Apakah asapnya sampai?',
          body: 'Pilih lokasi, lihat apakah asap dari titik panas berpotensi bergerak ke wilayahmu dalam beberapa jam ke depan.',
          status: 'available',
        },
        {
          key: 'timeline',
          title: 'Garis waktu asap',
          body: 'Geser waktu seperti prakiraan cuaca: kini, +3, +6, +12, sampai +24 jam.',
          status: 'available',
        },
        {
          key: 'map',
          title: 'Peta api & angin',
          body: 'Titik panas satelit, garis aliran angin, dan arah sebaran asap yang indikatif.',
          status: 'available',
        },
        {
          key: 'why',
          title: 'Kenapa begini?',
          body: 'Faktor penyebab dalam bahasa sederhana: tren PM2.5, arah angin, dan titik panas searah angin.',
          status: 'available',
        },
        {
          key: 'ai',
          title: 'Prakiraan AI',
          body: 'Model LightGBM dengan fitur titik panas berbasis arah angin dan penjelasan SHAP. Belum dievaluasi, belum dipakai di aplikasi.',
          status: 'building',
        },
        {
          key: 'alerts',
          title: 'Peringatan pintar',
          body: 'Notifikasi saat prakiraan di lokasi tersimpanmu memburuk, beserta tautan ke peringatan resmi.',
          status: 'planned',
        },
      ],
    },
    sources: {
      eyebrow: 'Sumber data',
      title: 'Data terbuka, sumbernya selalu terlihat.',
      body: 'Setiap angka di Pavana menyertakan sumber, jenis data (pengamatan, prakiraan, atau demo), dan waktu berlakunya.',
      status: {
        integrated: 'Terintegrasi',
        soon: 'Segera',
        link: 'Tautan resmi',
      },
      items: [
        {
          name: 'Open-Meteo',
          use: 'Prakiraan angin, suhu, kelembapan, hujan',
          status: 'integrated',
        },
        { name: 'CAMS (Copernicus)', use: 'Prakiraan PM2.5', status: 'integrated' },
        { name: 'BMKG', use: 'Prakiraan cuaca pembanding & sumber resmi', status: 'integrated' },
        { name: 'NASA FIRMS', use: 'Titik panas satelit VIIRS', status: 'soon' },
        { name: 'OpenAQ', use: 'Stasiun pemantau PM2.5 terdekat', status: 'soon' },
        { name: 'SiPongi · BNPB · BPBD', use: 'Status karhutla & arahan resmi', status: 'link' },
      ],
    },
    cta: {
      title: 'Lihat apakah asap sampai ke tempatmu.',
      body: 'Gratis, tanpa akun, langsung dari browser.',
    },
    footer: {
      project: 'Pavana · JOINTS 2026 · Sustainability',
      disclaimer: 'Bukan sumber peringatan resmi. Ikuti arahan BMKG dan BPBD setempat.',
      photoCredit: 'Foto lanskap: aset tim Pavana.',
    },
    questions: {
      title: 'Tentang cuaca, wildfire, dan Pavana',
      items: [
        {
          question: 'Apakah Pavana merupakan aplikasi weather atau prakiraan cuaca?',
          answer:
            'Pavana mengusung pengalaman seperti aplikasi cuaca (weather), dengan fokus pada hubungan angin, kualitas udara PM2.5, dan potensi dampak asap. Versi saat ini menampilkan skenario demo, bukan prakiraan cuaca langsung.',
        },
        {
          question: 'Apa hubungan Pavana dengan forest fire dan wildfire?',
          answer:
            'Forest fire berarti kebakaran hutan, sedangkan wildfire mencakup kebakaran vegetasi yang lebih luas. Pavana dirancang untuk menyajikan konteks titik panas satelit, angin, dan kualitas udara di wilayah rawan kebakaran hutan dan lahan gambut. Titik panas adalah deteksi anomali panas, bukan konfirmasi kebakaran. Pavana tidak memprediksi waktu kedatangan api atau memberi perintah evakuasi.',
        },
        {
          question: 'Apakah data cuaca dan kualitas udara Pavana sudah live?',
          answer:
            'Belum untuk publik. Integrasi Open-Meteo, CAMS, dan BMKG sudah dibangun dan sedang diuji; NASA FIRMS dan OpenAQ menyusul. Sementara itu aplikasi menampilkan demo dengan data sintetis untuk Kubu Raya, Kalimantan Barat, dan belum ada model machine learning yang terlatih. Untuk informasi terkini dan arahan resmi, periksa BMKG dan BPBD setempat.',
        },
      ],
    },
  },

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
