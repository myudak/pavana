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

  mobile: {
    appName: 'Pavana',
    locationTitle: 'Pilih lokasi',
    locationPermission:
      'Pavana menggunakan lokasi saat diminta untuk memilih area kualitas udara. Lokasi dibulatkan dan disimpan hanya di perangkat ini.',
    locationPrivacy:
      'Lokasi tersimpan di perangkat, dibulatkan hingga sekitar 1 km. Tidak ada pelacakan di latar belakang.',
    locationError: 'Lokasi belum bisa diperoleh. Coba lagi atau pilih lokasi secara manual.',
    changeLocation: 'Ubah lokasi',
    selectedLocation: 'Lokasi dipilih',
    demoLocation: 'Kembali ke demo Kubu Raya',
    close: 'Tutup',
    refresh: 'Perbarui data',
    temperature: 'Suhu',
    humidity: 'Kelembapan',
    wind: 'Angin',
    speedUnit: 'm/s',
    degreeUnit: '°C',
    humidityUnit: '%',
    aqi: 'US AQI',
    referenceTime: 'Waktu data',
    forecastHint: 'Nilai per jam · kategori US AQI bersifat indikatif',
    noForecast: 'Belum ada prakiraan untuk ditampilkan.',
    noHotspots: 'Tidak ada deteksi dalam area yang diminta. Ini tidak berarti tidak ada api.',
    hotspotDetail: 'Detail deteksi',
    hotspotSource: 'Deteksi anomali panas',
    confidence: { low: 'Rendah', nominal: 'Nominal', high: 'Tinggi' },
    powerUnit: 'MW',
    mapPreview: 'Pratinjau koordinat',
    mapNotConfigured:
      'Peta dasar Android belum dikonfigurasi untuk build ini. Koordinat dan detail deteksi tetap tersedia.',
    mapPreviewNote:
      'Peta dasar interaktif tersedia di aplikasi Android dan iOS. Pratinjau ini hanya menunjukkan koordinat deteksi.',
    mapArea: 'Deteksi di area sekitar lokasi dipilih. Peta dasar memerlukan internet.',
    dataSource: 'Sumber aplikasi',
    bundledDemo: 'Demo di perangkat',
    backend: 'Backend Pavana',
    backendDescription:
      'Gunakan respons API Pavana. Label demo atau live mengikuti sumber data yang dikembalikan backend.',
    backendUnavailable: 'Alamat backend belum dikonfigurasi.',
    demoDescription:
      'Skenario sintetis Kubu Raya yang sama dengan aplikasi web, dapat dibuka tanpa koneksi API.',
    version: 'Versi mobile · 0.1.0',
    methodUnavailable:
      'Keterangan model belum tersedia. Tidak ada metrik atau atribusi model yang ditampilkan.',
    openLinkError: 'Tautan belum bisa dibuka di perangkat ini.',
    startupError: 'Aplikasi belum bisa dimuat. Tutup dan buka kembali Pavana.',
    requestError:
      'Data belum bisa dimuat. Periksa koneksi dan konfigurasi backend, lalu coba lagi.',
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
