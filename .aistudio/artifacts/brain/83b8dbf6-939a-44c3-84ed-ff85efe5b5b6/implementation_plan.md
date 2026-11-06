# Rekap & Update Status Resi Pengiriman

Aplikasi web interaktif berbasis browser (client-side) berkinerja tinggi untuk memproses, mencocokkan, dan memutakhiran data pesanan lama dengan file export terbaru (seperti ekspor Shopee dengan puluhan kolom) secara otomatis tanpa ketergantungan server luar.

### User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan preferensi yang telah dikonfirmasi dan keputusan arsitektur utama:

- **Format Export Utama (Terkonfirmasi)**: Preset bawaan Shopee Indonesia dengan algoritma deteksi otomatis puluhan header kolom (No. Pesanan, Status Pesanan, No. Resi, Opsi Pengiriman, Nama Produk, SKU, Total Pembayaran, dll.), dilengkapi fallback re-mapping manual interaktif jika pengguna mengunggah file dari marketplace lain (Tokopedia, TikTok Shop, Lazada, ekspedisi).
- **Format Kolom Hasil Ekspor (Terkonfirmasi)**: Menjaga 100% kelengkapan seluruh kolom asli dari file sumber tanpa ada data yang hilang, lalu menambahkan kolom audit status di posisi terdepan: `[Audit] Status Terkini`, `[Audit] Status Sebelumnya`, `[Audit] Jenis Perubahan`, `[Audit] No. Resi Terkini`, dan `[Audit] Waktu Pemutakhiran`.
- **Fitur Pendukung Prioritas (Terkonfirmasi)**: Tautan cek resi instan 1-klik untuk seluruh kurir logistik populer di Indonesia (SPX Express, J&T Express, SiCepat, JNE, Ninja Van, Anteraja, ID Express, Lion Parcel) serta penanda visual badge yang jelas dan kontras tinggi untuk setiap kategori status pengiriman.
- **Opsi Pesanan Baru**: Switch toggle interaktif untuk memilih apakah pesanan baru (yang ada di file update tetapi belum tercatat di file lama) akan otomatis ditambahkan ke file hasil atau dipisahkan.

---

### 1. Overview & Core Concept

- **What It Does**: Membantu admin toko online, staf gudang, dan tim logistik membandingkan ribuan baris pesanan lama dengan file update status terbaru dari marketplace dalam hitungan detik. Mengidentifikasi pesanan yang berubah status (misalnya dari *Perlu Dikirim* menjadi *Sedang Dikirim*, atau dari *Sedang Dikirim* menjadi *Selesai* / *Dibatalkan*), menyematkan nomor resi terbaru, mencatat riwayat perubahan (Audit Trail), dan mengekspor hasilnya kembali ke format `.xlsx` atau `.csv`.
- **Target Audience / Persona**: Pemilik toko online, tim fulfillment logistik, seller e-commerce (Shopee, Tokopedia, TikTok Shop), serta staf administrasi pengiriman.
- **Key Value**: Mengeliminasi pencocokan manual manual dengan Excel VLOOKUP yang lambat, rentan salah, dan menghabiskan waktu berjam-jam saat menangani ratusan hingga ribuan paket per hari.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Upload & Auto-Detection**: Drag-and-drop File Lama (Master) dan File Update Terbaru (.xlsx, .xls, .csv). Sistem otomatis memindai dan mendeteksi kolom kunci (`No. Pesanan`, `Status Pesanan`, `No. Resi`, `Kurir/Opsi Pengiriman`).
  2. **Mapping Validation**: Pengguna melihat pratinjau deteksi kolom dan dapat mengubah pemetaan kolom secara manual bila diperlukan.
  3. **Reconciliation Engine**: Klik "Mulai Pemutakhiran Status". Mesin client-side memproses data secara instan, menghasilkan audit trail lengkap.
  4. **Interactive Dashboard**: Menampilkan kartu ringkasan (Total Diproses, Status Berubah, Status Tetap, Pesanan Baru, Dibatalkan/Retur) disertai grafik ringkasan dan tabel data berkinerja tinggi lengkap dengan filter status, pencarian nomor resi / pesanan, dan paginasi.
  5. **Quick Tracking & Detail Modal**: Klik pada nomor resi untuk membuka pelacakan instan via portal resmi ekspedisi atau melihat detail perubahan status baris tersebut.
  6. **Export**: Unduh hasil pemutakhiran ke file Excel (.xlsx) atau CSV dengan format kolom rapi dan terarsip.
  7. **Demo Data**: Tombol "Muat Data Sampel (Demo)" untuk langsung mencoba simulasi rekonsiliasi paket Shopee dengan variasi status realistis dalam 1 kali klik.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Enterprise Logistics & Analytics Dashboard yang bersih, terstruktur, dan elegan, mengadopsi standar modern SaaS (SaaS & Dashboard Design Guidelines).
  - *Color Palette & Mood*: Dominan Slate/Zinc neutral (`#0F172A`, `#F8FAFC`, `#FFFFFF`), aksen Indigo/Shopee Orange hangat (`#EE4D2D` / `#4F46E5`), hijau emerald untuk pesanan sukses/terkirim (`#059669`), biru untuk pesanan dalam perjalanan (`#2563EB`), kuning amber untuk proses/menunggu pengiriman (`#D97706`), dan merah rose untuk pembatalan/retur (`#DC2626`).
  - *Typography*: `Plus Jakarta Sans` untuk judul dan teks antarmuka, dipadukan dengan `font-mono tabular-nums` untuk nomor pesanan, nomor resi, nominal harga, dan timestamp agar sejajar rapi.
  - *Component Styling*: Permukaan flat dengan garis batas hairline halus (`border-slate-200 dark:border-slate-800`), layout responsif 1440px desktop baseline dengan dukungan mobile optimal.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Client-Side Excel/CSV Processing Engine (SheetJS `xlsx`)**:
  - *Chosen Approach*: Seluruh proses parsing dan export file Excel/CSV dieksekusi 100% di browser pengguna menggunakan library `xlsx`.
  - *Why*: Privasi data pelanggan terjamin penuh (data pesanan, alamat, dan nomor HP pembeli tidak pernah diunggah ke server mana pun), bebas latensi upload jaringan, dan dapat bekerja secara offline.
  - *Alternatives Considered*: Server-side backend processing (membutuhkan transmisi data besar, lambat pada koneksi lemot, dan menimbulkan isu keamanan data pribadi konsumen).

- **Decision 2: Preservasi Total Skema Kolom Asli (Non-Destructive Merge)**:
  - *Chosen Approach*: Menyimpan semua kolom asli dari File Lama dan menambahkan kolom audit status di posisi terdepan (`[Audit] ...`). Kolom-kolom pelengkap dari file update juga dapat disinkronkan.
  - *Why*: File export Shopee memiliki lebih dari 40 kolom (Rincian Produk, Variasi, Ongkos Kirim, Catatan Pembeli, dll.). Menghapus atau mengubah urutan kolom asli akan menyulitkan seller yang memiliki alur kerja lanjutan di Excel.

- **Decision 3: Fuzzy Column Matcher**:
  - *Chosen Approach*: Menggunakan algoritma fuzzy string matching dengan kamus sinonim untuk mengenali variasi penamaan kolom:
    - No Pesanan: `No. Pesanan`, `Order ID`, `Nomor Pesanan`, `order_sn`, `Order Number`
    - Status: `Status Pesanan`, `Status`, `Order Status`, `Status Pengiriman`, `order_status`
    - Resi: `No. Resi`, `Nomor Resi`, `Tracking Number`, `tracking_no`, `Airway Bill`, `AWB`
    - Kurir: `Opsi Pengiriman`, `Jasa Kirim`, `Kurir`, `Shipping Option`, `logistic_channel`

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interface Layer                            │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │ File Upload & DragZone│ │ Column Mapping    │ │ Demo Data Button │  │
│  └───────────┬───────────┘ └─────────┬─────────┘ └────────┬─────────┘  │
└──────────────┼───────────────────────┼────────────────────┼────────────┘
               ▼                       ▼                    ▼             
┌────────────────────────────────────────────────────────────────────────┐
│                   Data Processing & Parser Engine                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ SheetJS (xlsx/csv reader) + Column Header Normalization Pipeline │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      ▼                                   
┌────────────────────────────────────────────────────────────────────────┐
│                    Reconciliation & Audit Engine                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Indexing Old Records by Normalized Order ID                   │  │
│  │ 2. Status Diff Analysis: (Unchanged / Updated / New / Cancelled) │  │
│  │ 3. AWB Sync & Courier Detection (SPX, J&T, SiCepat, JNE, etc.)   │  │
│  │ 4. Audit Trail Generation & Timestamping                         │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      ▼                                   
┌────────────────────────────────────────────────────────────────────────┐
│                  Interactive Presentation & Export                     │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │ Statistics KPI Cards    │  │ Filterable & Paginated Data Table    │ │
│  │ (Changed, Same, New)    │  │ (Status Badges, Tracking Links)      │ │
│  └────────────┬────────────┘  └──────────────────┬───────────────────┘ │
│               └─────────────────┬────────────────┘                     │
│                                 ▼                                      │
│               ┌───────────────────────────────────┐                    │
│               │ Export Engine (.xlsx & .csv)      │                    │
│               └───────────────────────────────────┘                    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Interactive State Transitions**:
  - `filesState`: Menyimpan file lama dan file update (mentah & parsed).
  - `mappingConfig`: Menyimpan relasi kolom yang terdeteksi otomatis atau disesuaikan user.
  - `reconciliationResult`: Menyimpan data gabungan, ringkasan metrik (Changed, Same, New, Cancelled, Returned), serta log audit trail.
  - `filterState`: Pencarian teks (No Pesanan, Resi, Pembeli), filter tab jenis status, dan pagination state (10, 25, 50, 100 baris per halaman).
  - `demoMode`: Generator data instan dengan 15 sampel pesanan realistis (berisi data lama, data update terbaru dengan variasi perubahan resi & status pengiriman).

- **Direct Courier Tracking URL Formulas**:
  - SPX Express: `https://spx.co.id/`
  - J&T Express: `https://www.jet.co.id/track`
  - SiCepat: `https://www.sicepat.com/checkAwb`
  - JNE: `https://www.jne.co.id/id/tracking/trace`
  - Anteraja: `https://anteraja.id/tracking`
  - Ninja Xpress: `https://www.ninjaxpress.co/id-id/tracking`
  - ID Express: `https://idexpress.com/`
  - Universal CekResi: `https://cekresi.com/?noresi=${resi}` (fallback cerdas untuk kurir lainnya).
