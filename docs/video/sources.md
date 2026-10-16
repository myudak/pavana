# Competition video: sources and storyboard

**Status: first full cut built with Remotion in `apps/video`** (scene timings are in its
README). Length must be 2:00 or less. On-screen text only for now. Voice-over and music come
later.

Quotes were checked against the source pages on 16 Oct 2026. They are copied verbatim. Use them
exactly as written, and only shorten them with an ellipsis ("…").

Reddit users are credited as "warganet, r/indonesia", with no usernames.

## Verified quotes

| ID  | Quote                                                                                                                                                   | Speaker                                          | Source                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | "Aku ngerasa tempat yang aman untuk anakku hanya di kamar, tapi saat asap masuk aku kebingungan ke mana lagi anakku harus berlindung dari paparan asap" | Rani (27), guru honorer, Pontianak               | [Tirto, 26 Sep 2026](https://tirto.id/mimpi-sederhana-warga-kalimantan-bernapas-tanpa-asap-hDhq) (interview 24/9)                              |
| B   | "Sudah 2 bulan lebih belum juga reda, bahkan asap lebih parah."                                                                                         | Widia (30), Pontianak                            | Tirto, same article (21/9)                                                                                                                     |
| C   | "…selama 3 bulan setengah ini hanya 2 kali udara yang bersih dan matahari bisa menembus asap"                                                           | Linda (24), Gunung Mas, Kalteng                  | Tirto, same article (22/9)                                                                                                                     |
| D   | "Kami batuk-batuk, napas sesak setiap malam saat tidur karena asap itu sudah masuk ke rumah warga."                                                     | Linda (24)                                       | Tirto, same article                                                                                                                            |
| E   | "…tanpa ada solusi, hanya bisa menunggu."                                                                                                               | Dika (30), Palangka Raya                         | Tirto, same article (25/9)                                                                                                                     |
| F   | "Masih terus pembelajaran jarak jauh sampai waktu yang enggak tahu kapan"                                                                               | Nina Abadiah, Palangka Raya                      | [Liputan6, 15 Okt 2026](https://www.liputan6.com/regional/read/8313810/jerit-warga-palangka-raya-kabut-asap-menusuk-hidung-bikin-sakit-kepala) |
| G   | "Sudah pakai AC pun asap itu tetap tercium selama beberapa hari terakhir ini"                                                                           | Nina Abadiah                                     | Liputan6, same article                                                                                                                         |
| H   | "eh iya Kaltim kena karena arah angin musiman sudah berubah kah?"                                                                                       | warganet, r/indonesia                            | [Reddit, 17 Sep 2026](https://www.reddit.com/r/indonesia/comments/1wj6cng/is_it_fine_to_rant_about_the_smoke_haze/)                            |
| I   | "Kayaknya anginnya berubah arah."                                                                                                                       | warganet (Bintan), r/indonesia                   | [Reddit, 16 Sep 2026](https://www.reddit.com/r/indonesia/comments/1whro7y/kabut_asap_tenggarong_administration_area_kaltim/)                   |
| J   | "Walaupun di peta itu Denpasar masih hijau, tapi precaution apa yang sebaiknya diambil ya?"                                                             | warganet (Denpasar), r/indonesia                 | Reddit, 18 Sep 2026, thread H                                                                                                                  |
| K   | "Tempatku(kaltim) baru aja 2 hari lalu kena, ngeri2 sedap euy."                                                                                         | warganet (Kaltim), r/indonesia                   | Reddit, 17 Sep 2026, thread H                                                                                                                  |
| L   | "Oh udah sampe kaltim jg yah."                                                                                                                          | warganet, r/indonesia                            | Reddit, 16 Sep 2026, thread I                                                                                                                  |
| M   | "It's never ending…"                                                                                                                                    | warganet (Palembang, Sumsel), r/indonesia        | Reddit, 17 Sep 2026, thread H. The original continues with profanity, so cut it here.                                                          |
| N   | "Konsentrasi PM2.5 tidak otomatis langsung turun saat api atau titik panas (hotspot) padam."                                                            | Ardhasena Sopaheluwakan, Deputi Klimatologi BMKG | Tirto, same article (17/9)                                                                                                                     |

**Dropped:**

- "Sekolah saya masih tatap muka tapi sampai 10:30 saja..." is not in thread I.
- "Saya keluar rumah karna khawatir" (Zaskia, Kampar, Suara.com, 2025) has no source we could find, and it is from a different year and region.

## Numbers with sources

Use these only with the source on screen.

- **129.652 kasus ISPA** in 7 affected provinces, up to 13 Sep 2026. Source: Kemenkes, via Tirto.
- **32.896,67 ha terbakar** in Kalbar, Kalsel, Kalteng and Kaltim, 1 Aug to 14 Sep 2026. Source: BNPB, via Tirto.

## Visual assets

Use fallbacks first. Agency photos stay out unless they are licensed.

1. **NASA Worldview, 28 Aug 2026**
   - Smoke over Borneo drifting northwest. Captured by VIIRS on NOAA-20, with a version that overlays fire detections and an aerosol index.
   - US government imagery that is generally free to reuse; still check NASA's usage terms before publishing. Credit: "NASA Worldview".
   - Link: [earthdata.nasa.gov](https://www.earthdata.nasa.gov/news/worldview-image-archive/wildland-fires-indonesia-august-2026).
2. **Pavana screen recordings** in demo mode, at 390×844 inside a phone frame.
3. **Motion design** in Remotion:
   - Animated text for the quotes.
   - A Kalimantan map using hotspots and wind from `fixtures/scenario-kubu-raya.json`, labelled "data demo".
   - Pavi poses from `apps/web/src/assets/mascot/`.
4. **Auriga aerial photo**: ask Auriga for permission and keep the "Foto: Auriga" credit.
5. **CIFOR photo essay (2015, Central Kalimantan)**: CC BY-NC-SA 4.0. Check each photo's license on Flickr, and label it with the year.
   - Link: [forestsnews.cifor.org](https://forestsnews.cifor.org/36564/up-in-smoke-life-amid-the-fires-and-haze-of-central-kalimantan).
6. **Not without a license**: the orangutan, firefighter and yellow-sky Palangka Raya photos. These look like agency shots (ANTARA, AFP or Reuters).

## Storyboard (2:00, on-screen text)

| Time      | Visual                                                                                                                                                                                    | Text                                                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:10 | Black screen with the quote typed out, then a fade into a warm haze gradient.                                                                                                             | A, with "Rani, Pontianak · Tirto, Sep 2026".                                                                                  |
| 0:10–0:30 | NASA satellite image with a slow zoom into Kalimantan. Quote cards slide in.                                                                                                              | B, C, F, D. Then the stat "129.652 kasus ISPA" with its source.                                                               |
| 0:30–0:45 | Animated map: wind arrows spin back and forth, and Reddit-style anonymous bubbles pop up.                                                                                                 | L, H, I, J. Headline: "Semua orang menebak arah asap."                                                                        |
| 0:45–0:52 | Bridge                                                                                                                                                                                    | N (BMKG), then "Bagaimana kalau tidak perlu menebak?" Pavi appears with the logo.                                             |
| 0:52–1:35 | Demo in a phone frame: Beranda, Peta (hotspots upwind, wind), Prakiraan (peak and exposure strip), Tanya Pavi ("Apakah asap akan sampai ke sini?" with tool cards), and the notification. | A "Data demo · skenario Kubu Raya" label stays on screen.                                                                     |
| 1:35–1:50 | Principle cards                                                                                                                                                                           | "Titik panas = deteksi satelit, bukan kebakaran pasti" · "Data kosong ≠ aman" · "Sumber: NASA FIRMS, OpenAQ, prakiraan cuaca" |
| 1:50–2:00 | Pavi waves, logo                                                                                                                                                                          | "Tahu lebih awal kapan asap datang." · pavana.myudak.com                                                                      |

**Honesty rules:**

- Label the demo data.
- Mark Tanya Pavi and the alerts as "prototype".
- Don't claim AI forecasting, because it isn't connected to the app yet.
- Every quote and number shows its source on screen.
