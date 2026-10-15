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
} as const satisfies Record<string, Quote>;

/** Kemenkes figure as reported by Tirto (26 Sep 2026). */
export const ISPA_STAT = {
  value: 129652,
  label: 'kasus ISPA di 7 provinsi terdampak karhutla',
  asOf: 'kumulatif hingga 13 September 2026',
  source: 'Sumber: Kementerian Kesehatan, via Tirto.id (26 Sep 2026)',
} as const;
