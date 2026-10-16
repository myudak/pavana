"""Builds the JOINTS 2026 solution document (Times New Roman, A4, max. 10 pages).

    python docs/submission/build_document.py

Writes docs/submission/Pavana-Dokumen-Solusi-JOINTS-2026.docx. Every figure in the text is taken
from docs/video/sources.md, docs/data-sources.md, docs/modeling-methodology.md or ml/README.md.
"""

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HERE = Path(__file__).parent
ASSETS = HERE / "assets"
OUT = HERE / "Pavana-Dokumen-Solusi-JOINTS-2026.docx"
FONT = "Times New Roman"
BLACK = RGBColor(0, 0, 0)
BODY_SPACING = 1.15

doc = Document()


# ---------------------------------------------------------------- page + styles


def set_font(style_or_run, size=12, bold=None, italic=None):
    font = style_or_run.font
    font.name = FONT
    font.size = Pt(size)
    font.color.rgb = BLACK
    if bold is not None:
        font.bold = bold
    if italic is not None:
        font.italic = italic
    element = style_or_run.element if hasattr(style_or_run, "element") else style_or_run._element
    rpr = element.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts")
        rpr.append(fonts)
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        fonts.set(qn(attr), FONT)


section = doc.sections[0]
section.page_width, section.page_height = Cm(21), Cm(29.7)
section.top_margin = section.bottom_margin = Cm(3)
section.left_margin, section.right_margin = Cm(4), Cm(3)

normal = doc.styles["Normal"]
set_font(normal)
normal.paragraph_format.space_after = Pt(0)
normal.paragraph_format.line_spacing = BODY_SPACING

for name, size in (("Heading 1", 12), ("Heading 2", 12)):
    style = doc.styles[name]
    set_font(style, size=size, bold=True, italic=False)
    style.paragraph_format.space_before = Pt(12 if name == "Heading 1" else 8)
    style.paragraph_format.space_after = Pt(6 if name == "Heading 1" else 2)
    style.paragraph_format.line_spacing = BODY_SPACING
    style.paragraph_format.keep_with_next = True


def add_page_number(sec):
    footer = sec.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run()
    for tag, text in (("begin", None), (None, "PAGE"), ("end", None)):
        if tag:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tag)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = text
        run._r.append(el)
    set_font(run, size=11)


# ---------------------------------------------------------------- helpers


def para(text="", align=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=True, size=12, bold=False,
         italic=False, space_after=6):
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.first_line_indent = Cm(1.0) if indent else None
    pf.space_after = Pt(space_after)
    if text:
        add_runs(p, text, size=size, bold=bold, italic=italic)
    return p


def add_runs(p, text, size=12, bold=False, italic=False):
    """Supports *italic* spans for foreign terms."""
    parts = text.split("*")
    for i, part in enumerate(parts):
        if not part:
            continue
        run = p.add_run(part)
        set_font(run, size=size, bold=bold, italic=italic or i % 2 == 1)


def numbered(items, size=12):
    for i, item in enumerate(items, 1):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        pf = p.paragraph_format
        pf.left_indent = Cm(0.75)
        pf.first_line_indent = Cm(-0.75)
        pf.space_after = Pt(2)
        pf.tab_stops.add_tab_stop(Cm(0.75))
        add_runs(p, f"{i}.\t{item}", size=size)
    doc.paragraphs[-1].paragraph_format.space_after = Pt(6)


def chapter(title):
    h = doc.add_heading(level=1)
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = h.add_run(title)
    set_font(run, bold=True)


def sub(title):
    h = doc.add_heading(level=2)
    run = h.add_run(title)
    set_font(run, bold=True)


def caption(text, before=4, after=4):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(before)
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.keep_with_next = True
    label, _, rest = text.partition(" ")
    r = p.add_run(label + " ")
    set_font(r, size=11, bold=True)
    add_runs(p, rest, size=11)
    return p


def table(header, rows, widths, size=10.5):
    t = doc.add_table(rows=1, cols=len(header))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for row_cells in [header, *rows]:
        cells = t.rows[0].cells if row_cells is header else t.add_row().cells
        for cell, text, width in zip(cells, row_cells, widths):
            cell.width = Cm(width)
            p = cell.paragraphs[0]
            p.paragraph_format.line_spacing = 1.0
            p.paragraph_format.space_after = Pt(0)
            add_runs(p, text, size=size, bold=row_cells is header)
    # Rows never split, and small tables stay on one page (keep-with-next on every row but the last).
    for i, row in enumerate(t.rows):
        row_pr = row._tr.get_or_add_trPr()
        row_pr.append(OxmlElement("w:cantSplit"))
        if i < len(t.rows) - 1:
            for cell in row.cells:
                for cp in cell.paragraphs:
                    cp.paragraph_format.keep_with_next = True
    # Repeat the header row.
    tr_pr = t.rows[0]._tr.get_or_add_trPr()
    el = OxmlElement("w:tblHeader")
    el.set(qn("w:val"), "true")
    tr_pr.append(el)
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(4)
    spacer.paragraph_format.line_spacing = 1.0
    return t


def figure(images, labels, width_cm, cap):
    t = doc.add_table(rows=2, cols=len(images))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (img, label) in enumerate(zip(images, labels)):
        top = t.cell(0, i).paragraphs[0]
        top.alignment = WD_ALIGN_PARAGRAPH.CENTER
        top.add_run().add_picture(str(ASSETS / img), width=Cm(width_cm))
        bottom = t.cell(1, i).paragraphs[0]
        bottom.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(bottom, label, size=10)
    caption(cap, before=4, after=8)


def equation(text, number):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(4)
    pf.space_after = Pt(6)
    pf.tab_stops.add_tab_stop(Cm(7), WD_TAB_ALIGNMENT.CENTER)
    pf.tab_stops.add_tab_stop(Cm(14), WD_TAB_ALIGNMENT.RIGHT)
    run = p.add_run("\t" + text)
    set_font(run, italic=True)
    run = p.add_run(f"\t({number})")
    set_font(run)


def page_break():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ---------------------------------------------------------------- cover


for _ in range(2):
    para(indent=False)
para("DOKUMEN SOLUSI", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=14, bold=True)
para("JOINTS 2026 · SUBTEMA SUSTAINABILITY", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False,
     size=12, space_after=36)
logo = para(align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, space_after=24)
logo.add_run().add_picture(str(ASSETS / "pavana-icon.png"), width=Cm(3.2))
para("PAVANA", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=16, bold=True, space_after=6)
para("Aplikasi Prakiraan Kualitas Udara dan Potensi Dampak Asap Kebakaran Hutan dan Lahan "
     "Berbasis Lokasi", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, size=14, bold=True,
     space_after=60)
para("Disusun oleh:", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, space_after=4)
para("Tim [Nama Tim]", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, bold=True, space_after=4)
for member in ("[Nama Anggota 1] (Ketua)", "[Nama Anggota 2]", "[Nama Anggota 3]",
               "[Nama Anggota 4]"):
    para(member, align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, space_after=0)
for _ in range(4):
    para(indent=False)
para("[NAMA INSTITUSI]", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, bold=True, space_after=0)
para("2026", align=WD_ALIGN_PARAGRAPH.CENTER, indent=False, bold=True, space_after=0)

body = doc.add_section(WD_SECTION.NEW_PAGE)
body.footer.is_linked_to_previous = False
add_page_number(body)
# Number the body from 1; the cover carries no number.
pg = OxmlElement("w:pgNumType")
pg.set(qn("w:start"), "1")
body._sectPr.append(pg)


# ---------------------------------------------------------------- BAB I


chapter("BAB I\nPENDAHULUAN")
sub("1.1 Latar Belakang")
para("Kebakaran hutan dan lahan (karhutla) kembali melanda Indonesia sepanjang musim kemarau "
     "2026. Badan Nasional Penanggulangan Bencana (BNPB) mencatat luas lahan terbakar di "
     "Kalimantan Barat, Kalimantan Selatan, Kalimantan Tengah, dan Kalimantan Timur mencapai "
     "32.896,67 hektare dalam periode 1 Agustus hingga 14 September 2026. Pada periode yang sama, "
     "Kementerian Kesehatan melaporkan 129.652 kasus infeksi saluran pernapasan akut (ISPA) "
     "secara kumulatif di tujuh provinsi terdampak hingga 13 September 2026, dan 30.194 kasus di "
     "antaranya terjadi pada anak berusia lima tahun ke bawah (Septioyudho, 2026).")
para("Dampak asap meluas ke kehidupan sehari-hari. Sekolah di sejumlah kota beralih ke "
     "pembelajaran jarak jauh, kegiatan luar ruangan dibatasi, dan pengeluaran rumah tangga untuk "
     "masker, vitamin, serta air bersih meningkat. Center of Economic and Law Studies (CELIOS) "
     "memperkirakan kerugian ekonomi dan kesehatan akibat karhutla pada Januari hingga Agustus "
     "2026 mencapai Rp39,29 triliun hingga Rp123,1 triliun (dikutip dalam Septioyudho, 2026).")
para("Dalam kondisi tersebut, warga harus mengambil keputusan setiap hari, misalnya apakah anak "
     "boleh bermain di luar, kapan jendela perlu ditutup, atau apakah perjalanan sebaiknya "
     "ditunda. Data yang dibutuhkan untuk menjawab pertanyaan itu sebenarnya tersedia secara "
     "terbuka, mulai dari deteksi titik panas satelit, prakiraan angin, hingga prakiraan "
     "konsentrasi PM2.5. Namun, data tersebut tersebar di banyak situs, memakai istilah teknis, dan "
     "tidak langsung menjawab kebutuhan warga. Akibatnya, banyak warga hanya dapat menebak arah "
     "dan waktu datangnya asap. Dokumen ini menjelaskan Pavana, aplikasi web yang dikembangkan "
     "tim untuk menjembatani kesenjangan tersebut.")

sub("1.2 Rumusan Masalah")
numbered([
    "Bagaimana menyajikan data titik panas, angin, dan kualitas udara yang tersebar menjadi "
    "informasi yang dapat dipahami warga awam dalam waktu singkat?",
    "Bagaimana memberikan gambaran potensi paparan asap di suatu lokasi tanpa membuat klaim yang "
    "melampaui kemampuan data?",
    "Bagaimana menjaga kejujuran informasi ketika data tidak lengkap, terlambat, atau tidak "
    "tersedia?",
])

sub("1.3 Tujuan")
numbered([
    "Membangun aplikasi berbasis lokasi yang merangkum kondisi kualitas udara dan potensi "
    "paparan asap dalam satu jawaban sederhana.",
    "Mengembangkan indikator paparan yang memperhitungkan arah angin terhadap titik panas dengan "
    "metode yang terbuka dan dapat diuji.",
    "Menerapkan aturan penyajian yang mencantumkan sumber, jenis, dan waktu berlaku pada setiap "
    "angka.",
])

sub("1.4 Batasan")
para("Pavana bukan sumber peringatan resmi dan tidak memberikan perintah evakuasi. Pavana juga "
     "tidak memprediksi penyebaran api maupun waktu tiba asap. Titik panas diperlakukan sebagai "
     "deteksi satelit, bukan kebakaran yang terkonfirmasi. Seluruh angka aplikasi yang muncul "
     "dalam dokumen ini berasal dari skenario demo Sungai Raya, Kabupaten Kubu Raya, Kalimantan "
     "Barat, kecuali disebutkan lain.")


# ---------------------------------------------------------------- BAB II


chapter("BAB II\nANALISIS MASALAH")
sub("2.1 Pengalaman Warga")
para("Untuk memahami kebutuhan pengguna, tim menelaah liputan media dan percakapan daring warga "
     "selama musim asap 2026. Setiap kutipan pada Tabel 1 telah diperiksa langsung terhadap "
     "sumbernya pada 16 Oktober 2026 dan ditulis sesuai aslinya.")
caption("Tabel 1. Kutipan warga terdampak asap")
table(
    ["Narasumber", "Kutipan", "Sumber"],
    [
        ["Rani (27), guru honorer, Pontianak",
         "“…saat asap masuk aku kebingungan ke mana lagi anakku harus berlindung dari "
         "paparan asap”", "Tirto.id, 26 Sep 2026"],
        ["Linda (24), Gunung Mas, Kalimantan Tengah",
         "“…selama 3 bulan setengah ini hanya 2 kali udara yang bersih dan matahari bisa "
         "menembus asap”", "Tirto.id, 26 Sep 2026"],
        ["Nina Abadiah, Palangka Raya",
         "“Masih terus pembelajaran jarak jauh sampai waktu yang enggak tahu kapan”",
         "Liputan6.com, 15 Okt 2026"],
        ["Warganet, r/indonesia",
         "“eh iya Kaltim kena karena arah angin musiman sudah berubah kah?”",
         "Reddit, 17 Sep 2026"],
        ["Warganet (Denpasar), r/indonesia",
         "“Walaupun di peta itu Denpasar masih hijau, tapi precaution apa yang sebaiknya "
         "diambil ya?”", "Reddit, 18 Sep 2026"],
    ],
    widths=[3.6, 7.4, 3.0],
)
para("Kutipan tersebut memperlihatkan tiga pola. Pertama, warga merasa tidak memiliki ruang yang "
     "benar-benar aman dari asap dan tidak mengetahui kapan kondisi akan membaik. Kedua, warga "
     "menebak arah asap dari perubahan angin tanpa alat bantu yang jelas. Ketiga, angka indeks "
     "kualitas udara yang tersedia belum diterjemahkan menjadi langkah yang perlu dilakukan. "
     "Liputan yang sama mencatat bahwa beberapa narasumber memantau kualitas udara melalui "
     "aplikasi IQAir setiap hari, tetapi angka saat ini tidak menjawab kapan asap akan memburuk di "
     "lokasi mereka.")

sub("2.2 Kesenjangan Informasi")
para("Sumber data yang relevan sudah tersedia. NASA FIRMS menyediakan deteksi anomali panas dari "
     "satelit VIIRS dalam hitungan jam. Open-Meteo menyediakan prakiraan cuaca dan prakiraan "
     "PM2.5 dari model CAMS milik Copernicus. BMKG menerbitkan prakiraan cuaca resmi, sedangkan "
     "SiPongi dan BNPB menyajikan informasi kebakaran dan kebencanaan. Persoalannya terletak pada "
     "penyajian. Setiap sumber memakai format, satuan, dan zona waktu yang berbeda, dan tidak ada "
     "yang secara langsung menjawab pertanyaan warga, yaitu apakah asap mungkin memengaruhi "
     "daerahnya dalam beberapa jam ke depan.")
para("Deputi Bidang Klimatologi BMKG, Ardhasena Sopaheluwakan, menjelaskan bahwa konsentrasi "
     "PM2.5 tidak otomatis turun saat titik panas padam karena partikel halus dapat bertahan di "
     "udara selama beberapa hari hingga beberapa minggu dan berpindah hingga ribuan kilometer "
     "(Septioyudho, 2026). Dengan demikian, jumlah titik panas di sekitar lokasi saja tidak cukup "
     "untuk memahami risiko paparan. Arah angin, prakiraan PM2.5, dan posisi lokasi terhadap "
     "sumber asap perlu dibaca bersama.")

sub("2.3 Kebutuhan Pengguna")
para("Pengguna utama Pavana adalah warga di sekitar wilayah rawan karhutla, terutama di "
     "Kalimantan dan Sumatra, yang tidak memiliki latar belakang teknis. Pengguna kedua adalah "
     "relawan dan komunitas lokal yang memerlukan konteks untuk disebarkan. Dari analisis di atas, "
     "tim merumuskan lima kebutuhan: (1) satu jawaban yang dapat dipahami dalam sekitar sepuluh "
     "detik; (2) gambaran perubahan kondisi dalam 24 jam ke depan; (3) penjelasan sederhana "
     "tentang penyebab perubahan; (4) kejelasan asal dan umur data; serta (5) tautan ke sumber "
     "resmi ketika kondisi memburuk.")


# ---------------------------------------------------------------- BAB III


chapter("BAB III\nSOLUSI YANG DIUSULKAN")
sub("3.1 Gambaran Umum")
para("Pavana adalah aplikasi web yang mengutamakan tampilan ponsel dan dirancang menyerupai "
     "aplikasi cuaca. Pengguna memilih lokasi, lalu Pavana menampilkan potensi paparan asap, "
     "kondisi PM2.5 saat ini, dan perubahannya per jam. Nama Pavana berasal dari kata Sanskerta "
     "yang berkaitan dengan angin dan udara. Antarmuka menggunakan bahasa Indonesia dan dapat "
     "dibuka melalui peramban tanpa instalasi. Fitur utama Pavana dirangkum pada Tabel 2, dan "
     "tampilannya ditunjukkan pada Gambar 1.")
caption("Tabel 2. Fitur Pavana dan statusnya")
table(
    ["Fitur", "Fungsi", "Status"],
    [
        ["Beranda", "Menjawab “Apakah asap akan sampai ke sini?” dengan tingkat potensi "
         "paparan, PM2.5 saat ini, kategori kualitas udara, dan garis waktu asap 24 jam",
         "Berjalan"],
        ["Peta", "Titik panas satelit, aliran angin, dan jejak arah asap indikatif di sekitar "
         "lokasi", "Berjalan"],
        ["Prakiraan", "Grafik PM2.5 per jam, tabel cuaca, faktor penyebab perubahan, dan "
         "wawasan otomatis", "Berjalan"],
        ["Info", "Kartu ringkasan, metodologi, serta tautan ke BMKG, SiPongi, BNPB, BPBD Kalbar, "
         "dan NASA FIRMS", "Berjalan"],
        ["Peringatan pintar", "Notifikasi peramban saat potensi asap di lokasi meningkat",
         "Prototipe"],
        ["Tanya Pavi", "Asisten percakapan dengan maskot Pavi yang menjawab pertanyaan "
         "menggunakan data aplikasi", "Prototipe"],
    ],
    widths=[3.0, 8.6, 2.4],
)
figure(
    ["today-1.jpg", "map.jpg", "forecast-1.jpg", "chat-answer.jpg"],
    ["(a) Beranda", "(b) Peta", "(c) Prakiraan", "(d) Tanya Pavi"],
    width_cm=3.2,
    cap="Gambar 1. Tampilan aplikasi Pavana pada ponsel (data demo Sungai Raya, Kubu Raya)",
)
para("Tanya Pavi saat ini menggunakan percakapan contoh yang disusun dari data skenario demo dan "
     "belum memakai model bahasa. Antarmukanya sudah menerapkan pola pemanggilan alat (*tool "
     "call*): Pavi menampilkan langkah pengecekan data, seperti cek kualitas udara atau cek arah "
     "angin, sebelum memberikan jawaban. Pada tahap berikutnya, model bahasa akan dihubungkan "
     "melalui server dengan alat yang sama sehingga setiap angka dalam jawaban tetap berasal dari "
     "data dan bukan dari karangan model.")

sub("3.2 Prinsip Penyajian Data")
para("Aplikasi yang membahas kesehatan dan bencana harus dapat dipercaya. Karena itu, Pavana "
     "menerapkan aturan berikut pada kode maupun antarmuka.")
numbered([
    "Setiap angka disertai sumber, jenis data (pengamatan, prakiraan, turunan, atau demo), waktu "
    "berlaku, dan waktu pengambilan.",
    "Data yang tidak tersedia ditampilkan sebagai “tidak diketahui”, tidak pernah diisi "
    "nol, dan tidak pernah diberi label “baik”.",
    "Titik panas selalu disebut sebagai deteksi satelit. Ketiadaan deteksi tidak dianggap sebagai "
    "ketiadaan api.",
    "Arah angin mengikuti konvensi meteorologi (arah datangnya angin) dan dikonversi secara "
    "eksplisit sebelum dipakai sebagai arah aliran.",
    "Kategori kualitas udara mengikuti *breakpoint* US EPA (2024) dan diberi label indikatif. "
    "ISPU belum ditampilkan karena *breakpoint*-nya belum diverifikasi terhadap regulasi.",
    "Pavana tidak memberikan perintah evakuasi dan selalu mengarahkan pengguna ke sumber resmi.",
])


# ---------------------------------------------------------------- BAB IV


chapter("BAB IV\nMETODOLOGI DAN TEKNOLOGI")
sub("4.1 Arsitektur Sistem")
para("Pavana dibangun sebagai *monorepo* TypeScript. Paket bersama memuat skema data (zod) dan "
     "fungsi matematika yang dipakai oleh server maupun klien. Server (Fastify) mengambil data dari "
     "penyedia, menormalkan satuan dan zona waktu WIB, WITA, atau WIT, lalu menghitung indikator "
     "secara deterministik. Klien (React) memvalidasi ulang setiap respons dengan skema yang sama "
     "sebelum menampilkannya. Aplikasi dan situs pengenalan (Astro) dideploy di Vercel, dan kunci "
     "API penyedia hanya disimpan di server. Eksperimen pembelajaran mesin berada di ruang kerja "
     "Python terpisah dan tidak tersambung ke aplikasi.")

sub("4.2 Sumber Data")
caption("Tabel 3. Sumber data dan status integrasi")
table(
    ["Sumber", "Data yang digunakan", "Status"],
    [
        ["NASA FIRMS", "Deteksi titik panas VIIRS: lokasi, waktu UTC, daya radiasi api (FRP)",
         "Adapter selesai; menunggu kunci API produksi"],
        ["Open-Meteo Weather", "Angin, suhu, kelembapan, dan hujan per jam",
         "Berjalan (diuji 16 Okt 2026)"],
        ["Open-Meteo Air Quality", "Prakiraan PM2.5 CAMS per jam, resolusi sekitar 45 km",
         "Berjalan (diuji 16 Okt 2026)"],
        ["OpenAQ v3", "PM2.5 stasiun terdekat (jarak ≤ 25 km, umur < 2 jam)",
         "Adapter selesai; menunggu kunci API"],
        ["BMKG Data Terbuka", "Prakiraan cuaca tiga jam sebagai pembanding",
         "Berjalan untuk 9 kota rawan asap"],
        ["BMKG, SiPongi, BNPB, BPBD Kalbar", "Informasi resmi", "Tautan"],
    ],
    widths=[3.6, 6.6, 3.8],
)
para("Versi publik saat ini berjalan dalam mode demo dengan skenario Sungai Raya, Kubu Raya. Mode "
     "data langsung akan diaktifkan setelah kunci API produksi ditambahkan dan hasilnya "
     "diverifikasi.")

sub("4.3 Indikator Paparan Searah Angin")
para("Inti analisis Pavana adalah indikator paparan searah angin. Indikator ini menjumlahkan "
     "kontribusi setiap titik panas berdasarkan intensitas, jarak, kesesuaian dengan arah angin, "
     "dan umur deteksi, seperti pada Persamaan (1).")
equation("S(x,t) = Σ FRPᵢ · exp(−dᵢ/λ) · max(0, ŵ · ĥᵢ) · exp(−aᵢ/τ)", 1)
para("FRPᵢ adalah daya radiasi api titik panas ke-i, dᵢ jarak geodesik dari titik panas ke "
     "lokasi, ŵ vektor satuan arah aliran angin, ĥᵢ vektor satuan dari titik panas menuju lokasi, "
     "dan aᵢ umur deteksi. Nilai yang digunakan adalah λ = 50 km dan τ = 24 jam. Titik panas yang "
     "berjarak lebih dari 300 km atau berumur lebih dari 48 jam tidak diperhitungkan. Suku max(0, "
     "ŵ · ĥᵢ) memastikan bahwa hanya titik panas di hulu angin yang memberi kontribusi.")
para("Indikator ini diimplementasikan dalam TypeScript dan Python, dan kedua implementasi diuji "
     "terhadap vektor uji yang sama. Indikator ini merupakan proksi. Perhitungannya tidak mencakup "
     "kenaikan kolom asap, percampuran vertikal, topografi, hujan, maupun waktu tempuh, sehingga "
     "nilainya tidak pernah ditampilkan sebagai peluang atau perkiraan waktu tiba asap.")

sub("4.4 Tingkat Potensi Paparan")
para("Jawaban di Beranda disusun per jam untuk 24 jam ke depan dengan mengambil tingkat tertinggi "
     "dari dua masukan, yaitu prakiraan PM2.5 dan nilai S pada jam tersebut. Tingkat yang dipakai "
     "adalah tidak ada, rendah, sedang, tinggi, dan tidak diketahui. Ambang PM2.5 mengikuti "
     "*breakpoint* US EPA (2024), yaitu 9,0; 35,4; dan 55,4 µg/m³. Ambang untuk S masih "
     "heuristik dan belum dikalibrasi terhadap pengamatan. Data yang hilang tidak pernah "
     "menurunkan tingkat paparan, dan jika kedua masukan tidak tersedia, hasilnya adalah "
     "“tidak diketahui”.")

sub("4.5 Eksperimen Pembelajaran Mesin")
para("Pertanyaan riset tim adalah apakah fitur berbasis angin dan titik panas dapat memperbaiki "
     "prediksi PM2.5 enam jam ke depan dibandingkan metode persistensi. Pertanyaan ini idealnya "
     "dijawab dengan data PM2.5 hasil pengukuran stasiun. Pemeriksaan pada 15 Oktober 2026 "
     "menunjukkan bahwa belum ada arsip pengukuran PM2.5 untuk Kalimantan yang dapat diakses. "
     "OpenAQ tidak memiliki stasiun di wilayah ini, sedangkan BMKG dan KLHK hanya menyediakan data "
     "sekitar 24 jam terakhir.")
para("Sebagai langkah awal, tim menjalankan eksperimen retrospektif dengan target keluaran model "
     "CAMS pada satu sel grid di Sungai Raya. Data latih mencakup tahun 2024, data validasi tahun "
     "2025, dan data uji 1 Januari hingga 14 Oktober 2026, dengan jeda enam jam di setiap batas "
     "periode. Lima varian dibandingkan pada 6.882 jam data uji (Tabel 4).")
caption("Tabel 4. Hasil eksperimen prediksi PM2.5 t+6 jam pada data uji")
table(
    ["Varian", "Fitur", "MAE (µg/m³)", "RMSE (µg/m³)"],
    [
        ["A", "Persistensi: nilai saat ini", "14,39", "28,38"],
        ["B", "Rerata per bulan dan jam dari data latih", "25,42", "47,09"],
        ["C", "LightGBM: riwayat CAMS, cuaca, dan waktu", "21,58", "43,48"],
        ["D", "C ditambah jumlah dan FRP titik panas", "20,75", "42,26"],
        ["E", "D ditambah indikator paparan searah angin", "20,89", "42,45"],
    ],
    widths=[1.6, 7.4, 2.5, 2.5],
)
para("Hasil ini negatif bagi model. Persistensi memberikan galat terkecil, sedangkan penambahan "
     "fitur titik panas dan indikator angin tidak memberikan perbaikan yang berarti. Salah satu "
     "penyebabnya adalah kadar PM2.5 pada periode uji yang jauh melampaui rentang data latih "
     "(median 17,2 dan maksimum 430,3 µg/m³, dibandingkan median 10,1 dan maksimum 66,4 µg/m³), "
     "sementara model berbasis pohon tidak dapat memprediksi di luar rentang yang pernah "
     "dipelajarinya. Karena targetnya adalah keluaran model dan bukan hasil pengukuran, "
     "eksperimen ini tidak dipakai di aplikasi dan tidak diklaim sebagai validasi.")

sub("4.6 Privasi dan Keamanan")
para("Lokasi pengguna hanya disimpan di perangkat dan dibulatkan sekitar satu kilometer. Izin "
     "geolokasi diminta hanya ketika pengguna menekan tombol lokasi, dan aplikasi tidak memerlukan "
     "akun. Kunci API tidak pernah dikirim ke peramban, dan setiap respons server divalidasi "
     "dengan skema sebelum dikirim.")


# ---------------------------------------------------------------- BAB V


chapter("BAB V\nSTATUS DAN RENCANA PENGEMBANGAN")
sub("5.1 Status Implementasi")
para("Aplikasi dapat diakses di app.pavana.myudak.com dan situs pengenalan di pavana.myudak.com. "
     "Kode diuji dengan 148 pengujian otomatis (59 pada paket bersama, 35 pada server, dan 54 pada "
     "aplikasi web), ditambah pemeriksaan *lint*, tipe, dan format pada setiap perubahan melalui "
     "integrasi berkelanjutan. Protokol uji pemahaman dengan lima responden sudah disusun, tetapi "
     "pengujiannya belum dilaksanakan. Hasilnya akan dilaporkan setelah pengujian dilakukan.")

sub("5.2 Rencana Pengembangan")
caption("Tabel 5. Rencana pengembangan")
table(
    ["Tahap", "Kegiatan"],
    [
        ["1. Jangka pendek", "Mengaktifkan data langsung pada versi publik setelah kunci FIRMS "
         "dan OpenAQ ditambahkan; melaksanakan uji pemahaman dengan lima responden."],
        ["2. Jangka menengah", "Menghubungkan Tanya Pavi ke model bahasa dengan alat yang sama; "
         "menambahkan notifikasi Web Push yang tetap berjalan saat aplikasi ditutup; menyimpan "
         "beberapa lokasi."],
        ["3. Jangka panjang", "Mengumpulkan arsip PM2.5 hasil pengukuran untuk eksperimen dengan "
         "target pengamatan; memverifikasi dan menampilkan ISPU; mengkalibrasi ambang indikator."],
    ],
    widths=[3.2, 10.8],
)

sub("5.3 Risiko dan Mitigasi")
caption("Tabel 6. Risiko dan mitigasi")
table(
    ["Risiko", "Mitigasi"],
    [
        ["Pengguna menganggap Pavana sebagai peringatan resmi",
         "Label “bukan peringatan resmi” dan tautan ke BMKG, SiPongi, serta BPBD pada "
         "layar terkait"],
        ["Data penyedia terlambat atau terputus",
         "Status “data lama” atau “data tidak cukup” ditampilkan; tidak ada "
         "angka yang diisi dengan tebakan"],
        ["Resolusi prakiraan CAMS kasar (sekitar 45 km)",
         "Resolusi dicantumkan pada data; PM2.5 stasiun ditampilkan bila tersedia"],
        ["Asisten percakapan mengarang angka",
         "Jawaban hanya boleh memuat hasil alat; daftar pertanyaan uji dievaluasi sebelum rilis"],
        ["Kuota dan biaya API", "Cache di server dan di *edge*, serta pembatasan permintaan"],
    ],
    widths=[5.4, 8.6],
)


# ---------------------------------------------------------------- BAB VI + VII


chapter("BAB VI\nDAMPAK DAN KEBERLANJUTAN")
para("Pavana diharapkan mempercepat pemahaman warga terhadap kondisi udara di lokasinya. "
     "Informasi yang sebelumnya tersebar di beberapa situs dirangkum menjadi satu jawaban yang "
     "disertai sumber. Dengan mengetahui kapan PM2.5 diperkirakan memuncak, warga dapat mengatur "
     "waktu aktivitas luar ruangan, menyiapkan masker, dan menutup ruangan sebelum asap menebal. "
     "Bagi relawan, Pavana menyediakan bahan komunikasi yang dapat dibagikan tanpa melebih-"
     "lebihkan kondisi.")
para("Pavana berkaitan dengan SDG 3 (Kehidupan Sehat dan Sejahtera) melalui pengurangan paparan "
     "polusi udara, SDG 11 (Kota dan Permukiman yang Berkelanjutan) melalui ketahanan masyarakat "
     "terhadap bencana, serta SDG 13 (Penanganan Perubahan Iklim) melalui peningkatan kapasitas "
     "adaptasi. Dari sisi keberlanjutan, sumber data yang digunakan bersifat terbuka atau gratis "
     "untuk penggunaan nonkomersial, dan infrastruktur *serverless* menjaga biaya tetap rendah. "
     "Penggunaan komersial di masa depan memerlukan lisensi Open-Meteo berbayar. Arsitektur "
     "penyedia yang terpisah juga memudahkan penambahan sumber baru, misalnya data stasiun "
     "pemerintah daerah.")

chapter("BAB VII\nPENUTUP")
para("Pavana menerjemahkan data titik panas satelit, angin, dan prakiraan PM2.5 menjadi jawaban "
     "berbasis lokasi yang dapat dipahami warga awam. Aplikasi ini dibangun di atas indikator "
     "yang terbuka, aturan penyajian data yang ketat, dan pengakuan yang jelas atas batas "
     "kemampuannya. Eksperimen pembelajaran mesin tim menghasilkan temuan negatif yang dilaporkan "
     "apa adanya, dan hambatan utamanya, yaitu ketiadaan arsip PM2.5 hasil pengukuran di "
     "Kalimantan, telah diidentifikasi. Tahap berikutnya adalah mengaktifkan data langsung, "
     "menguji pemahaman bersama warga, dan menyiapkan data pengamatan agar indikator dapat "
     "dikalibrasi.")


# ---------------------------------------------------------------- references


chapter("DAFTAR PUSTAKA")
refs = [
    "Aliansyah, M. A. (2026, 15 Oktober). Jerit warga Palangka Raya, kabut asap menusuk hidung "
    "bikin sakit kepala. *Liputan6.com*. https://www.liputan6.com/regional/read/8313810",
    "Badan Meteorologi, Klimatologi, dan Geofisika. (2026). *Data terbuka BMKG: Prakiraan cuaca*. "
    "https://data.bmkg.go.id/prakiraan-cuaca/",
    "NASA. (2026). *Fire Information for Resource Management System (FIRMS)*. "
    "https://firms.modaps.eosdis.nasa.gov/",
    "Open-Meteo. (2026). *Weather forecast API* dan *Air quality API*. https://open-meteo.com/",
    "OpenAQ. (2026). *OpenAQ API v3*. https://api.openaq.org/docs",
    "r/indonesia. (2026, 16 September). Kabut asap, Tenggarong administration area, Kaltim "
    "[Diskusi daring]. Reddit. https://www.reddit.com/r/indonesia/comments/1whro7y/",
    "r/indonesia. (2026, 17 September). Is it fine to rant about the smoke haze [Diskusi daring]. "
    "Reddit. https://www.reddit.com/r/indonesia/comments/1wj6cng/",
    "Septioyudho, H. (2026, 26 September). Mimpi sederhana warga Kalimantan: Bernapas tanpa asap. "
    "*Tirto.id*. https://tirto.id/mimpi-sederhana-warga-kalimantan-bernapas-tanpa-asap-hDhq",
    "U.S. Environmental Protection Agency. (2024). *Final updates to the Air Quality Index (AQI) "
    "for particulate matter*. https://www.epa.gov/",
]
for ref in refs:
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    pf = p.paragraph_format
    pf.left_indent = Cm(1.0)
    pf.first_line_indent = Cm(-1.0)
    pf.space_after = Pt(4)
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    add_runs(p, ref)

doc.core_properties.title = "Pavana: Dokumen Solusi JOINTS 2026"
doc.core_properties.author = "Tim Pavana"
doc.save(OUT)
print(OUT)
