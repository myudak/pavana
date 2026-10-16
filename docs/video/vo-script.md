# Naskah voice-over: Pavana (v3, fokus titik api dan lahan gambut)

Rekaman satu take disimpan di `apps/video/public/audio/vo.m4a`. Adegan dan subtitle otomatis
mengikuti waktu tiap kata di rekaman (`apps/video/src/v2/vo-timing.json`). Subtitle memakai teks
naskah ini (`apps/video/src/v2/script.ts`), jadi kalau kalimatnya diubah, ubah juga di file itu
lalu jalankan ulang `scripts/align-vo.py`.

Tips merekam:

- Tempo santai sekitar 2,2 kata per detik, nada tenang dan jelas.
- Jeda kecil di koma, jeda lebih panjang di titik. Ruangan senyap, tanpa musik.
- "PM2.5" dibaca "pe-em dua koma lima". "Pavana" dibaca "pa-va-na".

| #   | Adegan       | Baris                                                                                                                                                                                                                   |
| --- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `hook`       | Sejak Agustus, lebih dari tiga puluh dua ribu hektare lahan di Kalimantan terbakar. Di lahan gambut, api bisa menjalar di bawah permukaan, sulit dipadamkan, dan asapnya sampai ke rumah warga.                         |
| 2   | `problem`    | Warga di sekitar hutan dan gambut sering baru tahu ada titik api ketika asapnya sudah datang. Datanya sebenarnya ada, satelit mendeteksi titik panas setiap hari, tapi tersebar, teknis, dan sulit dipantau sejak dini. |
| 3   | `reveal`     | Kenalkan Pavana: cara mudah memantau titik api dan dampaknya, berdasarkan lokasimu.                                                                                                                                     |
| 4   | `peta`       | Di peta, setiap deteksi titik panas dari satelit diberi warna sesuai umurnya, jadi titik api yang baru langsung terlihat. Arah angin dan jejak asap menunjukkan ke mana dampaknya bergerak.                             |
| 5   | `model`      | Untuk memantau sejak dini, model pembelajaran mesin Pavana memperkirakan wilayah yang berisiko muncul titik panas besok, dari pola cuaca kering dan deteksi sebelumnya, lengkap dengan alasannya.                       |
| 6   | `beranda`    | Lalu Pavana menggabungkan titik panas, arah angin, dan prakiraan PM2.5 menjadi satu jawaban: apakah asap akan sampai ke tempatmu, dan kapan puncaknya.                                                                  |
| 7   | `chat`       | Masih bingung? Tanya Pavi. Pavi mengecek data dulu, lalu menjelaskan dengan bahasa sehari-hari.                                                                                                                         |
| 8   | `alerts`     | Pavana memberi tanda saat titik panas dan asap di sekitarmu meningkat, di web dan di Android.                                                                                                                           |
| 9   | `principles` | Kami jujur soal data: titik panas adalah deteksi satelit, bukan kebakaran yang pasti, dan data kosong bukan berarti aman.                                                                                               |
| 10  | `close`      | Hutan dan gambut tidak bisa dijaga sendirian. Tapi dengan memantau sejak dini, kita bisa bersiap lebih awal. Pavana.                                                                                                    |
