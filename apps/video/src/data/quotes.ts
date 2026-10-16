// Verbatim quotes, checked against the source on 16 Oct 2026. Keep in sync with
// docs/video/sources.md. Only shorten with "…"; never reword.

export type Quote = {
  id: string;
  text: string;
  /** Substring of `text` to highlight once it has been read. */
  emphasis?: string;
  speaker: string;
  place: string;
  source: string;
};

const TIRTO = 'Tirto.id · 26 Sep 2026';

export const QUOTES = {
  A: {
    id: 'A',
    text: 'Aku ngerasa tempat yang aman untuk anakku hanya di kamar, tapi saat asap masuk aku kebingungan ke mana lagi anakku harus berlindung dari paparan asap',
    emphasis: 'ke mana lagi anakku harus berlindung',
    speaker: 'Rani (27), guru honorer',
    place: 'Pontianak, Kalimantan Barat',
    source: TIRTO,
  },
  B: {
    id: 'B',
    text: 'Sudah 2 bulan lebih belum juga reda, bahkan asap lebih parah.',
    emphasis: '2 bulan lebih',
    speaker: 'Widia (30)',
    place: 'Pontianak, Kalimantan Barat',
    source: TIRTO,
  },
  C: {
    id: 'C',
    text: '…selama 3 bulan setengah ini hanya 2 kali udara yang bersih dan matahari bisa menembus asap',
    emphasis: 'hanya 2 kali',
    speaker: 'Linda (24)',
    place: 'Gunung Mas, Kalimantan Tengah',
    source: TIRTO,
  },
  F: {
    id: 'F',
    text: 'Masih terus pembelajaran jarak jauh sampai waktu yang enggak tahu kapan',
    emphasis: 'enggak tahu kapan',
    speaker: 'Nina Abadiah',
    place: 'Palangka Raya, Kalimantan Tengah',
    source: 'Liputan6.com · 15 Okt 2026',
  },
  N: {
    id: 'N',
    text: 'Konsentrasi PM2.5 tidak otomatis langsung turun saat api atau titik panas (hotspot) padam.',
    emphasis: 'tidak otomatis langsung turun',
    speaker: 'Ardhasena Sopaheluwakan, Deputi Klimatologi BMKG',
    place: '',
    source: TIRTO,
  },
} as const satisfies Record<string, Quote>;

/** r/indonesia comments, credited without usernames. */
export const REDDIT = [
  { id: 'L', text: 'Oh udah sampe kaltim jg yah.', date: '16 Sep 2026' },
  {
    id: 'H',
    text: 'eh iya Kaltim kena karena arah angin musiman sudah berubah kah?',
    date: '17 Sep 2026',
  },
  { id: 'I', text: 'Kayaknya anginnya berubah arah.', place: 'Bintan', date: '16 Sep 2026' },
  {
    id: 'J',
    text: 'Walaupun di peta itu Denpasar masih hijau, tapi precaution apa yang sebaiknya diambil ya?',
    place: 'Denpasar',
    date: '18 Sep 2026',
  },
] as const satisfies readonly { id: string; text: string; place?: string; date: string }[];

/** Kemenkes figure as reported by Tirto (26 Sep 2026). */
export const ISPA_STAT = {
  value: 129652,
  label: 'kasus ISPA di 7 provinsi terdampak karhutla',
  asOf: 'kumulatif hingga 13 September 2026',
  source: 'Sumber: Kementerian Kesehatan, via Tirto.id (26 Sep 2026)',
} as const;

/** BNPB burned-area figure as reported by Tirto (26 Sep 2026). */
export const BURNED_STAT = {
  value: 32896.67,
  label: 'hektare lahan terbakar di Kalimantan',
  asOf: 'Kalbar, Kalsel, Kalteng, Kaltim · 1 Agustus – 14 September 2026',
  source: 'Sumber: BNPB, via Tirto.id (26 Sep 2026)',
} as const;
