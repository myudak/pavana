/**
 * Bahasa Indonesia copy (default). Keep ALL user-facing strings here so an English
 * dictionary can be added later with the same shape.
 *
 * Wording rules: no certainty we don't have ("asap akan tiba pukul 16.00"), no "aman",
 * no evacuation instructions. Hotspot ≠ confirmed fire. PM2.5 ≠ "asap kebakaran".
 */
import type {
  DataState,
  ProvenanceKind,
  ExposureLevel,
  FactorId,
  FactorSignal,
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
          body: 'Notifikasi peramban saat potensi dampak asap di lokasimu meningkat. Versi demo berjalan selama Pavana terbuka; push dari server menyusul.',
          status: 'building',
        },
        {
          key: 'chat',
          title: 'Tanya Pavi',
          body: 'Maskot Pavi menjawab pertanyaan soal asap, titik panas, dan kualitas udara, lengkap dengan kartu data yang mudah dibaca. Versi demo memakai percakapan contoh; asisten AI sungguhan menyusul.',
          status: 'building',
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

  nav: { today: 'Beranda', map: 'Peta', chat: 'Tanya', forecast: 'Prakiraan', info: 'Info' },

  // Tanya Pavi — asisten chat. DEMO: jawaban berskrip dari skenario demo Kubu Raya,
  // belum ada LLM (lihat docs/backlog.md).
  chat: {
    name: 'Pavi',
    role: 'Asisten asap & udara',
    navLabel: 'Tanya Pavi',
    mascotAlt: 'Pavi, maskot Pavana',
    status: 'Demo',
    reset: 'Mulai ulang',
    greeting: 'Hai, aku Pavi!',
    intro:
      'Tanya soal asap, titik panas, dan kualitas udara. Aku cek datanya dulu, lalu jelaskan dengan bahasa sederhana.',
    demoBadge: 'Contoh percakapan · data demo Sungai Raya',
    suggestions: [
      'Apakah asap akan sampai ke sini?',
      'Kualitas udara sekarang?',
      'Ada titik panas di dekat sini?',
      'Perlu pakai masker?',
      'Kenapa udaranya begini?',
    ],
    placeholder: 'Tanya Pavi…',
    send: 'Kirim',
    stop: 'Berhenti',
    thinking: 'Pavi sedang mengecek…',
    footer:
      'Pavi masih versi demo: jawaban contoh dari skenario demo, bukan saran medis atau peringatan resmi.',
    tools: {
      running: 'Mengecek…',
      done: 'Selesai',
      details: 'Lihat detail',
      source: 'Sumber: pavana-fixture · data demo',
      names: {
        cek_kualitas_udara: 'Cek kualitas udara',
        cek_titik_panas: 'Cek titik panas',
        apakah_asap_sampai: 'Apakah asap sampai?',
        cek_angin: 'Cek angin',
        saran_kesehatan: 'Saran kesehatan',
      },
      radius: (km: number, h: number) => `Dalam radius ${km} km · ${h} jam terakhir`,
      detections: 'deteksi',
      upwind: (n: number) => `${n} di arah datangnya angin`,
      hotspotNote: 'Deteksi satelit — indikasi titik panas, bukan kebakaran yang terkonfirmasi.',
      peak: (v: string, at: string) => `Puncak ${v} µg/m³ sekitar ${at}`,
      exposureNote:
        'Indikatif — dari arah angin, titik panas, dan prakiraan PM2.5. Bukan pengukuran asap.',
      windTo: (dir: string) => `Bertiup ke ${dir}`,
      adviceNote: 'Saran umum, bukan saran medis. Ikuti arahan resmi setempat.',
      axis: ['Kini', '+12 jam', '+24 jam'],
    },
    replies: {
      greeting:
        'Hai! Aku Pavi 🍃 Aku bisa bantu cek kualitas udara, titik panas, arah angin, dan apakah asap berpotensi sampai ke lokasimu. Coba tanya salah satu pertanyaan di bawah, ya.',
      air: [
        'Aku cek PM2.5 di Sungai Raya dulu, ya.',
        'Sekarang PM2.5 sekitar 33,9 µg/m³ — kategori **Sedang**. Tapi prakiraannya naik: puncaknya sekitar 159,9 µg/m³ pukul 19.00 WIB. Kalau kamu sensitif, rencanakan aktivitas luar ruangan lebih pagi.',
      ],
      reach: [
        'Pertanyaan utama! Aku lihat arah angin dan titik panas di sekitarmu dulu.',
        'Angin datang dari tenggara, dan 101 dari 103 deteksi titik panas berada di arah datangnya angin.',
        'Jadi potensi paparan asap di Sungai Raya **tinggi** hari ini, terutama sekitar pukul 13.00–01.00 WIB, dengan puncak sekitar pukul 19.00. Ini indikator, bukan kepastian — pantau juga kanal resmi.',
      ],
      hotspots: [
        'Aku cek deteksi satelit di sekitar Sungai Raya.',
        'Ada 103 deteksi titik panas dalam radius 300 km selama 48 jam terakhir, 101 di antaranya searah datangnya angin. Ingat, ini deteksi panas dari satelit — belum tentu kebakaran.',
      ],
      mask: [
        'Aku cek kondisi udara dulu sebelum kasih saran.',
        'PM2.5 sekarang Sedang, tapi diperkirakan naik ke kategori tidak sehat menjelang sore. Ini beberapa langkah yang bisa kamu lakukan:',
      ],
      why: [
        'Biar jelas, aku cek dua faktor utamanya: angin dan titik panas.',
        'Udara memburuk karena angin bertiup dari tenggara — arah tempat sebagian besar titik panas terdeteksi — sehingga asap berpotensi terbawa ke sini. Prakiraan PM2.5 juga naik sampai sore.',
      ],
      fallback:
        'Maaf, di versi demo aku baru bisa menjawab beberapa pertanyaan: kualitas udara, titik panas, arah angin, apakah asap akan sampai, dan saran masker. Coba salah satu saran di bawah, ya!',
    },
    advice: [
      'Pakai masker N95/KN95 saat di luar ruangan, terutama sore hari.',
      'Kurangi aktivitas berat di luar ruangan, apalagi untuk anak, lansia, dan penderita asma.',
      'Tutup jendela saat udara memburuk; gunakan penjernih udara bila ada.',
      'Pantau prakiraan Pavana dan kanal resmi (SiPongi, BMKG).',
    ],
  },

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
    heroDesc: {
      good: 'Udara relatif bersih. Nikmati aktivitas luar ruangan seperti biasa.',
      moderate:
        'Kualitas udara cukup baik. Kelompok yang sensitif sebaiknya memperhatikan kondisi tubuh.',
      unhealthy_sensitive:
        'Kelompok sensitif disarankan mengurangi aktivitas berat di luar ruangan.',
      unhealthy: 'Batasi aktivitas di luar ruangan dan kurangi paparan polusi.',
      very_unhealthy: 'Hindari aktivitas berat di luar ruangan dan kurangi paparan udara luar.',
      hazardous: 'Hindari aktivitas di luar ruangan sebisa mungkin.',
    } satisfies Record<UsAqiCategory, string>,
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
          actions: ['Ikuti arahan otoritas; evakuasi hanya bila diperintahkan.'],
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
          actions: ['Cek sumber informasi resmi.', 'Jangan menyimpulkan kondisi aman.'],
          limit: 'Angka PM2.5 tidak ditampilkan.',
        },
      } satisfies Record<NotificationId, RecommendationRule>,
    },
  },

  info: {
    title: 'Info',
    linksTitle: 'Sumber resmi',
    aboutTitle: 'Tentang Pavana',
    aboutBody:
      'Pavana menerjemahkan data satelit, cuaca, dan prakiraan kualitas udara menjadi informasi yang mudah dipahami untuk lokasimu. Pavana bukan sumber peringatan resmi.',
    theme: 'Tema',
    themeOptions: { light: 'Terang', dark: 'Gelap', system: 'Sistem' },
    subtitle: 'Ringkasan data, sumber resmi, dan status pemantauan.',

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

  // Notifikasi — DEMO: hanya berjalan saat Pavana terbuka di peramban (lihat docs/backlog.md).
  alerts: {
    title: 'Peringatan pintar',
    status: 'Demo',
    body: 'Pavana memberi tahu saat potensi dampak asap di lokasimu meningkat, dari aturan yang sama dengan halaman Prakiraan. Versi demo: notifikasi hanya dikirim saat Pavana terbuka di peramban ini. Notifikasi push dari server belum dibangun.',
    bellLabel: 'Notifikasi',
    bellLabelUnread: 'Notifikasi — ada yang perlu perhatian',
    sheetTitle: 'Notifikasi',
    empty: 'Belum ada hal yang perlu diperhatikan dari data saat ini. Tetap pantau kanal resmi.',
    seeForecast: 'Lihat prakiraan',
    settingsTitle: 'Notifikasi peramban',
    enable: 'Aktifkan notifikasi',
    enabled: 'Notifikasi aktif',
    demoNote: 'Demo · dikirim hanya saat Pavana terbuka.',
    test: 'Kirim contoh notifikasi',
    testSent: 'Contoh notifikasi dikirim.',
    sendFailed: 'Notifikasi gagal ditampilkan di peramban ini.',
    unsupported: 'Peramban ini tidak mendukung notifikasi.',
    denied: 'Izin notifikasi ditolak. Ubah lewat pengaturan situs di peramban.',
    confirmTitle: 'Notifikasi Pavana aktif',
    confirmBody: 'Kamu akan diberi tahu saat potensi dampak asap meningkat (demo).',
    testTitle: 'Contoh notifikasi Pavana',
    testBody: 'Begini tampilan peringatan Pavana. Ini hanya contoh, bukan kondisi nyata.',
    demoSuffix: 'Data demo',
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
