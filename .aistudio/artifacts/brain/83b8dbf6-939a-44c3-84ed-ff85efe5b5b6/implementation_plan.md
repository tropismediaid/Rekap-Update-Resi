# Fleksibilitas Kunci Pencocokan & Filter Data Cocok

Pemutakhiran mesin rekonsiliasi untuk mendukung pencocokan data berdasarkan **No. Pesanan** atau **No. Resi**, disertai fitur kontrol filter toggle untuk menyembunyikan data lama yang tidak tercantum dalam file update terbaru.

### User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan keputusan yang telah dikonfirmasi oleh pengguna:

- **Kunci Pencocokan Fleksibel (Terkonfirmasi)**: Menyediakan selektor opsi sebelum rekonsiliasi dijalankan:
  1. *Mode No. Pesanan (Default)*: Mencocokkan data berdasarkan nomor pesanan (Order ID / Order SN).
  2. *Mode No. Resi*: Mencocokkan data langsung berdasarkan nomor resi pengiriman (AWB / Tracking Number), cocok ketika file update hanya memuat daftar resi dan status ekspedisi tanpa nomor pesanan.
- **Filter Toggle Data Tak Ditemukan (Terkonfirmasi)**: Menambahkan tombol filter toggle di antarmuka (`Hanya Tampilkan Data Cocok / Terupdate`) serta tab status khusus (`Tidak Ditemukan di Update`), sehingga pengguna dapat dengan leluasa menyembunyikan data lama yang tidak ada di file baru atau menampilkannya kembali untuk audit.
- **Penyelarasan Ekspor**: Hasil ekspor Excel (.xlsx), CSV (.csv), dan PDF (.pdf) akan otomatis mengikuti status filter tampilan yang aktif.

---

### 1. Overview & Core Concept

- **Problem**: Pengguna sering kali memiliki file update dari logistik/ekspedisi yang hanya memuat No. Resi dan status pengiriman tanpa No. Pesanan. Selain itu, saat data lama tidak tercantum di file baru, pengguna ingin opsi untuk menyembunyikannya agar tabel hanya menampilkan paket-paket yang benar-benar diperbarui.
- **Solution**:
  1. Mesin rekonsiliasi diperbarui agar dapat mengindeks dan mencocokkan data baik dengan `No. Pesanan` maupun `No. Resi`.
  2. Menambahkan status khusus: `TIDAK_ADA_DI_UPDATE` untuk baris data lama yang nomor kuncinya tidak ditemukan di file update terbaru.
  3. Menyediakan kontrol toggle interaktif di FilterBar dan pengaturan awal: *"Hanya tampilkan data yang cocok di file baru"*.

---

### 2. User Experience & Visual Design

- **Panel Konfigurasi Upload**:
  - Menambahkan radio/segmented control di bagian atas tombol proses:
    - `Kunci Pencocokan: [No. Pesanan] | [No. Resi]`
  - Menambahkan opsi checkbox: `Sembunyikan data lama yang tidak ada di file update (Hanya data cocok)`
- **FilterBar & Dashboard Status**:
  - Menambahkan tab filter baru: `Tidak di Update` (menunjukkan jumlah baris data lama yang absen di file baru).
  - Menambahkan tombol switch cepat: `Hanya Data Cocok` yang langsung memfilter tabel tanpa perlu memproses ulang file.
- **Data Table & Komparasi**:
  - Kolom status mencantumkan badge abu-abu halus untuk data yang tidak ditemukan di file update (`Tidak Ada di File Update`).
  - Modal komparasi berdampingan tetap dapat dibuka untuk meninjau data asli.

---

### 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Selection Controls                         │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────┐ │
│  │ Match Key: [No Pesanan / No Resi]│ │ Toggle: [Hanya Data Cocok]   │ │
│  └──────────────────┬───────────────┘ └──────────────┬───────────────┘ │
└─────────────────────┼────────────────────────────────┼─────────────────┘
                      ▼                                ▼                  
┌────────────────────────────────────────────────────────────────────────┐
│                   Reconciliation Engine Pipeline                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 1. Indexing Target File by Selected Match Key (Order ID / AWB)   │  │
│  │ 2. Status Classification:                                        │  │
│  │    - BERUBAH (Nilai status/resi berubah)                         │  │
│  │    - TETAP (Nilai status/resi sama persis)                       │  │
│  │    - BARU (Ada di file baru, tidak ada di lama)                  │  │
│  │    - TIDAK_DITEMUKAN (Ada di file lama, tidak ada di baru)       │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
└─────────────────────────────────────┼──────────────────────────────────┘
                                      ▼                                   
┌────────────────────────────────────────────────────────────────────────┐
│               Interactive Dashboard & Filter Rendering                 │
│  - Filter toggle: 'Hanya Data Cocok' otomatis menyaring                │
│    hanya baris BERUBAH, TETAP (matched), dan BARU                      │
│  - Ekspor Excel, CSV, dan PDF mengikuti filter yang aktif              │
└────────────────────────────────────────────────────────────────────────┘
```

- **Perubahan Model State**:
  - `matchingKey`: `'orderId'` | `'trackingNumber'` (default: `'orderId'`).
  - `onlyMatched`: `boolean` (default: `false` dengan toggle 1-klik untuk mengaktifkan).
  - Tipe `StatusChangeType`: menambahkan `'TIDAK_DITEMUKAN'` ke dalam klasifikasi data dan kartu statistik.
