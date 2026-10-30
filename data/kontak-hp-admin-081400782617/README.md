# Dataset Kontak WhatsApp — HP Admin Utama (`081400782617`)

Dokumentasi dan dataset hasil ekstraksi serta klasifikasi kontak dari **HP Admin Pusat (@upsheru - `081400782617`)**, yang telah diverifikasi dan dicocokkan langsung terhadap database WastePay (`Petugas`, `User`, dan `Pelanggan`).

---

## 1. Ringkasan Statistik Klasifikasi (1.159 Kontak Unik)

| Kategori | Jumlah Kontak | Persentase | Keterangan |
| :--- | :---: | :---: | :--- |
| **Pelanggan SUDAH Terdaftar** | **810** | **69,9%** | **94,8% dari total 854 pelanggan database** tersimpan di HP Admin |
| **Pelanggan BELUM Terdaftar** | **327** | **28,2%** | Warga / toko / calon pelanggan potensial yang belum tercatat di sistem |
| **Petugas & Kru Lapangan** | **16** | **1,4%** | Driver, knek, admin, pengawas, dan pimpinan manajemen |
| **Luar Negeri & Bot** | **6** | **0,5%** | Meta AI, Asisten Bisnis, dan nomor internasional |

---

## 2. Struktur Berkas

- **[`kontak_mentah_hp_admin.csv`](./kontak_mentah_hp_admin.csv)**: Data kontak mentah hasil ekspor langsung dari HP Admin WhatsApp.
- **[`pelanggan_sudah_terdaftar.csv`](./pelanggan_sudah_terdaftar.csv)**: 810 kontak pelanggan yang sudah aktif di database (lengkap dengan ID DB, Kode, Alamat, Wilayah, Kategori, Tarif, dan Label WA).
- **[`pelanggan_belum_terdaftar.csv`](./pelanggan_belum_terdaftar.csv)**: 327 kontak warga/calon pelanggan yang belum terdaftar di aplikasi.
- **[`petugas_dan_kru.csv`](./petugas_dan_kru.csv)**: 16 nomor tim operasional internal.
- **[`rekap_lengkap.json`](./rekap_lengkap.json)**: Ringkasan terstruktur format JSON untuk integrasi otomasi.

---

## 3. Daftar Petugas, Driver & Tim Internal (16 Nomor)

Semua nomor tim operasional internal berikut **dikecualikan secara otomatis dari daftar kampanye blast**:

| No | Nama di Kontak WA | Nama Publik WA | Nomor Telepon | Role / Jabatan | Keterangan Sistem |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | `@upsheru` | - | `0814-0078-2617` | `admin` *(Pusat)* | **HP Admin Operasional Utama (Terisolasi)** |
| 2 | `Team Novi Doyok` | `doyok nopi` | `0896-8815-1473` | `petugas` *(survei/knek)* | **Device Khusus Blast Calon Pelanggan** *(Petugas ID: 37)* |
| 3 | `Team Ago` | `Afifah` | `0821-2511-5021` | `petugas` *(survei/angkut)* | Tim Operasional Driver Ago |
| 4 | `-` | `/Adam` | `0896-0295-0531` | `petugas` *(survei/angkut)* | Ago Driver *(Petugas ID: 44)* |
| 5 | `Team Awal` | `Bakwan Rebus` | `0877-4266-7520` | `petugas` *(angkut/survei)* | Awal Driver *(Petugas ID: 49, User ID: 64)* |
| 6 | `Team Cepot` | - | `0896-7552-8057` | `petugas` *(angkut/survei)* | Cepot Driver *(Petugas ID: 46)* |
| 7 | `Team Riyan Jaba` | - | `0895-3850-58054`| `petugas` *(angkut/survei)* | Ryan Dump Truck Driver *(Petugas ID: 36)* |
| 8 | `Team Odon` | - | `0831-8262-8794` | `petugas` *(angkut/survei)* | Kru Lapangan Team Odon |
| 9 | `Bang Heru` | `Heru GembeL` | `0815-3284-3224` | `superadmin` | CEO WastePay / Pelanggan ID 177 |
| 10 | `Nce Nya BangHeru` | - | `0882-9062-4931` | `internal` | Kontak Internal Manajemen |
| 11 | `Omax` | `O M A R` | `0857-1625-1003` | `superadmin` *(tagih)* | Rohmat Eko *(Petugas ID: 39, User ID: 50)* |
| 12 | `-` | `Chimorry` | `0857-8121-9141` | `petugas` *(angkut/survei)* | Piat Driver *(Petugas ID: 50, User ID: 66)* |
| 13 | `-` | `Adittttyyy` | `0853-5328-6062` | `petugas` *(survei/angkut)* | Adit Pickup *(Petugas ID: 38)* |
| 14 | `-` | `.` | `0895-0270-3352` | `petugas` *(angkut/survei)* | Paung Knek *(Petugas ID: 47)* |
| 15 | `-` | `Tunggu Ekonomi..`| `0896-7542-4339` | `petugas` *(angkut/survei)* | Dani Knek *(Petugas ID: 48)* |
| 16 | `-` | `Rama` | `0858-3641-5075` | `petugas` *(survei)* | Rama Lapangan / Surveyor |

---

## 4. Temuan Kontak Berlabel di WhatsApp HP Admin

| Kontak WA & Nomor | Label di WhatsApp Admin | Status Database | Rekomendasi Tindakan |
| :--- | :--- | :--- | :--- |
| **Pak Pino & Pak Eko**<br>`0895-8032-30509` | `PELANGGA. BELUM TERDAFTAR APLIKASI` | ❌ Belum Ada di DB | Masuk antrean pendaftaran pelanggan baru. |
| **RAY YKP**<br>`0812-2233-9929` | `PELANGGA. BELUM TERDAFTAR APLIKASI` | ❌ Belum Ada di DB | Masuk antrean pendaftaran area Blok YKP Kelapa. |
| **Ibu Leni (mama jonathan)**<br>`0821-1046-8764` | `PELANGGA. BELUM TERDAFTAR APLIKASI` | ✅ **SUDAH ADA (ID: 1005)**<br>*Alamat: Gg Hj Sain No. 34 (Rp 40.000)* | Label di HP Admin dapat **dilepas/diperbarui** karena sudah terdaftar resmi. |
| **Christian**<br>`0821-9109-5134` | `GANTI NAMA PELANGGAN` | ✅ Terdaftar (ID: 611, Gg Niman) | Update nama pelanggan di menu Admin Pelanggan. |
| **Bmk b8 ykp**<br>`0856-9580-9599` | `Sudah bayar 3 bulan` | ✅ Terdaftar (ID: 338, BMK YKP) | Verifikasi pelunasan tagihan 3 bulan di modul penagihan. |
| **RUMAH BERBI**<br>`0812-3771-1800` | `Bulan Nopember udah bayar` | ✅ Terdaftar (ID: 654, Sasak) | Verifikasi status pembayaran tagihan November. |

---

## 5. Aturan Keamanan Device & Isolasi Blast

> [!IMPORTANT]
> **Kebijakan Isolasi Nomor**: Nomor `081400782617` adalah **saluran resmi layanan pusat (customer service & operasional)**.
> - **DILARANG** menggunakan nomor ini untuk mengirim blast promosi masal guna menghindari risiko penalti/pemblokiran WhatsApp (*anti-banned policy*).
> - Seluruh pengiriman blast kampanye calon pelanggan **wajib dialihkan ke device pengirim khusus `089688151473`** (token Fonnte: `8n46RV2x9GosQYgtAS1j`) yang tersimpan di [`data/blast-calon-089688151473/`](../blast-calon-089688151473/).
