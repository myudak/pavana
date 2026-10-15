# Skenario demo & naskah video Pavana (2–3 menit)

> Status: berdasarkan fitur yang **benar-benar berjalan** di mode demo (`PAVANA_MODE=demo`,
> skenario sintetis Kubu Raya — lihat `fixtures/README.md`). Jangan membacakan angka dari
> dokumen ini; sebutkan angka yang tampil di layar dan tegaskan labelnya.
> Terakhir diverifikasi berjalan: `pnpm dev` — web `:5173`, api `:8787`, landing `:4321`.

## Persiapan (sebelum merekam)

1. `pnpm install`, salin `.env.example` → `.env` (tetap `PAVANA_MODE=demo`), jalankan `pnpm dev`.
2. Buka aplikasi di **lebar 375 px** (mobile) untuk segmen utama; siapkan tab **1280 px** (desktop)
   untuk menunjukkan adaptasi layar.
3. Pastikan banner **"Mode Demo · Data ilustratif"** terlihat di layar Hari Ini.
4. Siapkan stopwatch: target total **2–3 menit** (± 350–450 kata).

## Alur demo (langkah demi langkah, dapat diulang)

| #   | Layar   | Aksi presenter                                            | Poin yang ditekankan                                    |
| --- | ------- | --------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Hari Ini | Buka aplikasi (default: Sungai Raya, Kubu Raya). Tunjuk banner demo. | Lokasi, nilai PM2.5 + satuan µg/m³, sumber & waktu berlaku. |
| 2   | Hari Ini | Baca headline tren + timeline 24 jam ke depan.            | Arah perubahan, bukan angka pasti.                       |
| 3   | Hari Ini | Ketuk "Lihat penjelasan" (faktor: tren PM2.5, angin, titik panas searah angin). | "Kenapa bisa berubah" — indikator deterministik, bukan ML. |
| 4   | Peta    | Buka Peta, tunjuk lokasi + deteksi titik panas, klik satu titik. | Waktu deteksi & sumber; deteksi ≠ konfirmasi kebakaran. |
| 5   | Peta    | Tunjuk arah angin + legenda + atribusi peta.              | Angin dalam m/s, arah FROM meteorologis.                 |
| 6   | Insight | Buka Insight: grafik prakiraan PM2.5 + faktor + "Bagaimana ini dihitung?". | Metodologi transparan; belum ada model terlatih. |
| 7   | Info    | Buka Info: tautan resmi (BMKG, SiPongi, BNPB, BPBD Kalbar). | Pavana bukan sumber peringatan resmi; ikuti arahan otoritas. |

## Naskah video (±2,5 menit, Bahasa Indonesia)

> **0:00–0:20 — Masalah.** "Setiap musim kemarau, asap kebakaran hutan dan lahan bisa sampai
> ke rumah warga Kalimantan Barat — tanpa kabar yang jelas. Informasinya tersebar di banyak
> situs lembaga. Pavana merangkumnya jadi satu jawaban sederhana: bagaimana udara di tempatmu,
> dan apa yang perlu diperhatikan."
>
> **0:20–1:00 — Hari Ini.** "Ini layar Hari Ini untuk Sungai Raya, Kubu Raya. Yang tampil
> sekarang adalah *skenario demo berlabel* — bukan data nyata. Terlihat nilai PM2.5, kategorinya,
> sumber, dan waktu berlakunya. Di bawahnya ada prakiraan 24 jam dan alasannya: tren PM2.5,
> angin, dan titik panas searah angin. Ini indikator deterministik yang dijelaskan terbuka —
> bukan model machine learning."
>
> **1:00–1:40 — Peta.** "Di Peta, terlihat lokasi, deteksi titik panas satelit, dan arah angin.
> Setiap titik bisa diklik untuk melihat *waktu deteksinya*. Penting: deteksi satelit bukan
> konfirmasi kebakaran, dan tidak ada deteksi bukan berarti tidak ada api."
>
> **1:40–2:20 — Insight & Info.** "Layar Insight menunjukkan grafik prakiraan dan cara
> perhitungannya — termasuk keterbatasannya. Dan di Info, Pavana mengarahkan ke sumber resmi:
> BMKG, SiPongi, BNPB, dan BPBD Kalimantan Barat. Pavana tidak mengeluarkan peringatan resmi
> dan tidak memberi perintah evakuasi."
>
> **2:20–2:30 — Penutup.** "Pavana: semudah aplikasi cuaca, tapi jujur soal ketidakpastian."

## Larangan saat demo (checklist kejujuran data)

- [ ] Tidak menyebut angka demo sebagai pengamatan nyata.
- [ ] Tidak mengklaim titik panas = kebakaran terkonfirmasi.
- [ ] Tidak menjanjikan waktu tiba asap atau keamanan lokasi.
- [ ] Tidak mengklaim ada model ML terlatih (belum ada — lihat `docs/modeling-methodology.md`).
- [ ] Tidak menampilkan diri sebagai peringatan resmi/evakuasi.
