// Video v2 script: one entry per scene, in order. `vo` is the voice-over line (Indonesian) and
// doubles as the on-screen subtitle. `seconds` is the planned length; when a recording exists
// at public/vo/<id>.wav (or .mp3), calculateMetadata stretches the scene to fit it.
// `sfx` marks where sound effects go once music and SFX are added.

export interface ScriptScene {
  id: string;
  seconds: number;
  vo: string;
  sfx?: string;
}

export const SCRIPT = [
  {
    id: 'vo-01',
    seconds: 12,
    vo: 'Musim kemarau tahun ini, asap karhutla menyelimuti Kalimantan berminggu-minggu. Seorang ibu di Pontianak bertanya: ke mana lagi anaknya harus berlindung?',
    sfx: 'low drone, typing ticks on the quote',
  },
  {
    id: 'vo-02',
    seconds: 16,
    vo: 'Datanya sebenarnya ada. Satelit mendeteksi titik panas, model memprakirakan angin dan PM2.5. Tapi semuanya tersebar, teknis, dan tidak menjawab satu pertanyaan sederhana: apakah asap akan sampai ke tempatku?',
    sfx: 'soft pops as detections appear, whoosh on bubbles',
  },
  {
    id: 'vo-03',
    seconds: 8,
    vo: 'Kenalkan Pavana. Seperti aplikasi prakiraan cuaca, tapi untuk asap.',
    sfx: 'riser into the smoke wipe, chime on the logo',
  },
  {
    id: 'vo-04',
    seconds: 12,
    vo: 'Pavana menggabungkan tiga sinyal, titik panas satelit, arah angin, dan prakiraan PM2.5, menjadi satu jawaban untuk lokasimu.',
    sfx: 'three soft clicks as layers lock in',
  },
  {
    id: 'vo-05',
    seconds: 10,
    vo: 'Buka aplikasinya, langsung terlihat: potensi paparan hari ini, PM2.5 saat ini, dan kapan puncaknya, misalnya pukul tujuh malam.',
    sfx: 'UI ticks on the count-up',
  },
  {
    id: 'vo-06',
    seconds: 12,
    vo: 'Di peta, titik panas diberi warna sesuai umurnya, aliran angin dari prakiraan bergerak, dan jejak arah asap memperlihatkan ke mana udara itu terbawa.',
    sfx: 'zoom whoosh, airy wind bed',
  },
  {
    id: 'vo-07',
    seconds: 12,
    vo: 'Model pembelajaran mesin Pavana, dilatih dari deteksi satelit dan jarak pandang di bandara, memperkirakan risiko titik panas dan asap tebal, lengkap dengan alasannya.',
    sfx: 'data sweep as the grid fills',
  },
  {
    id: 'vo-08',
    seconds: 13,
    vo: 'Masih bingung? Tanya Pavi. Pavi mengecek data dulu, lalu menjelaskan dengan bahasa sehari-hari.',
    sfx: 'message pop, tool tick',
  },
  {
    id: 'vo-09',
    seconds: 8,
    vo: 'Pavana juga memberi tanda saat potensi asap meningkat, di web dan di Android.',
    sfx: 'notification chime',
  },
  {
    id: 'vo-10',
    seconds: 9,
    vo: 'Dan Pavana jujur soal data: titik panas adalah deteksi, data kosong bukan berarti aman, dan setiap angka punya sumber.',
    sfx: 'three stamps',
  },
  {
    id: 'vo-11',
    seconds: 8,
    vo: 'Asap tidak bisa kita hentikan sendiri. Tapi kita bisa bersiap lebih awal. Pavana.',
    sfx: 'music resolves',
  },
] as const satisfies readonly ScriptScene[];

export type SceneId = (typeof SCRIPT)[number]['id'];
