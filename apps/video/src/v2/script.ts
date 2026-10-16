// Video script v3 (focus: monitoring titik api around forests and peatland early; smoke is the
// impact). One entry per scene, in order. `vo` is the voice-over line exactly as written; the
// burned-in subtitles show this text, timed to the recorded voice-over word by word
// (src/v2/vo-timing.json, built by scripts/align-vo.py from public/audio/vo.m4a).
// `seconds` is the fallback length when no timing file exists. `sfx` notes the sound design.

export interface ScriptScene {
  id: string;
  seconds: number;
  vo: string;
  sfx?: string;
}

export const SCRIPT = [
  {
    id: 'hook',
    seconds: 14,
    vo: 'Sejak Agustus, lebih dari tiga puluh dua ribu hektare lahan di Kalimantan terbakar. Di lahan gambut, api bisa menjalar di bawah permukaan, sulit dipadamkan, dan asapnya sampai ke rumah warga.',
    sfx: 'impact on the number, embers crackle',
  },
  {
    id: 'problem',
    seconds: 15,
    vo: 'Warga di sekitar hutan dan gambut sering baru tahu ada titik api ketika asapnya sudah datang. Datanya sebenarnya ada, satelit mendeteksi titik panas setiap hari, tapi tersebar, teknis, dan sulit dipantau sejak dini.',
    sfx: 'pops as detections appear, whoosh on bubbles',
  },
  {
    id: 'reveal',
    seconds: 8,
    vo: 'Kenalkan Pavana: cara mudah memantau titik api dan dampaknya, berdasarkan lokasimu.',
    sfx: 'riser into the smoke wipe, impact on the logo',
  },
  {
    id: 'peta',
    seconds: 12,
    vo: 'Di peta, setiap deteksi titik panas dari satelit diberi warna sesuai umurnya, jadi titik api yang baru langsung terlihat. Arah angin dan jejak asap menunjukkan ke mana dampaknya bergerak.',
    sfx: 'zoom whoosh',
  },
  {
    id: 'model',
    seconds: 14,
    vo: 'Untuk memantau sejak dini, model pembelajaran mesin Pavana memperkirakan wilayah yang berisiko muncul titik panas besok, dari pola cuaca kering dan deteksi sebelumnya, lengkap dengan alasannya.',
    sfx: 'scan sweep as the grid fills',
  },
  {
    id: 'beranda',
    seconds: 12,
    vo: 'Lalu Pavana menggabungkan titik panas, arah angin, dan prakiraan PM2.5 menjadi satu jawaban: apakah asap akan sampai ke tempatmu, dan kapan puncaknya.',
    sfx: 'three clicks as layers lock in',
  },
  {
    id: 'chat',
    seconds: 7,
    vo: 'Masih bingung? Tanya Pavi. Pavi mengecek data dulu, lalu menjelaskan dengan bahasa sehari-hari.',
    sfx: 'message pop',
  },
  {
    id: 'alerts',
    seconds: 7,
    vo: 'Pavana memberi tanda saat titik panas dan asap di sekitarmu meningkat, di web dan di Android.',
    sfx: 'notification pop',
  },
  {
    id: 'principles',
    seconds: 9,
    vo: 'Kami jujur soal data: titik panas adalah deteksi satelit, bukan kebakaran yang pasti, dan data kosong bukan berarti aman.',
    sfx: 'three stamps',
  },
  {
    id: 'close',
    seconds: 11,
    vo: 'Hutan dan gambut tidak bisa dijaga sendirian. Tapi dengan memantau sejak dini, kita bisa bersiap lebih awal. Pavana.',
    sfx: 'music resolves',
  },
] as const satisfies readonly ScriptScene[];

export type SceneId = (typeof SCRIPT)[number]['id'];
