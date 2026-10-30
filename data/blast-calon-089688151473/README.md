# Kampanye Blast WhatsApp — Calon Pelanggan Belum Terdaftar

Dokumentasi dan dataset kampanye pesan WhatsApp untuk calon pelanggan/warga yang belum terdaftar di sistem WastePay (UPS HERU).

---

## 1. Konfigurasi Device & Provider

> [!IMPORTANT]
> **Aturan Isolasi Device**: Data dan pengiriman ini **khusus menggunakan nomor pengirim `089688151473`** dengan token Fonnte terpisah. **DILARANG** digabungkan atau menggunakan nomor admin utama `081400782617`.

| Parameter | Nilai Konfigurasi | Keterangan |
| :--- | :--- | :--- |
| **Nomor Pengirim (Device)** | `089688151473` | Nomor WhatsApp khusus pengiriman blast calon pelanggan |
| **Provider API** | Fonnte | https://api.fonnte.com/send |
| **Fonnte API Token** | `8n46RV2x9GosQYgtAS1j` | Token terisolasi khusus device `089688151473` |
| **Nomor Terlarang / Pengecualian** | `081400782617` | Nomor Admin Utama (tidak boleh menerima/mengirim kampanye ini) |
| **Nomor Pengecualian Lain** | `081532843224` *(Owner)*, `089688151473` *(Self)* | Dikecualikan otomatis dari daftar kirim |
| **Total Target Unik** | **204 Kontak** | Sudah diverifikasi & bersih dari duplikasi |

---

## 2. Struktur File

- **[`config.json`](./config.json)**: Konfigurasi teknis token, device pengirim, dan daftar pengecualian.
- **[`target_pelanggan_belum_terdaftar.csv`](./target_pelanggan_belum_terdaftar.csv)**: File CSV 204 target penerima (dapat dibuka di Excel).
- **[`target_pelanggan_belum_terdaftar.json`](./target_pelanggan_belum_terdaftar.json)**: File JSON 204 target penerima untuk otomasi skrip.

---

## 3. Rincian Segmentasi Wilayah Target (204 Kontak)

1. **Blok Bawah Dmiles + SMP 6**: 28 Kontak
2. **Blok Tabroni**: 22 Kontak
3. **Blok Sasak**: 20 Kontak
4. **Blok Bakung**: 16 Kontak
5. **Blok Setu & Pete**: 14 Kontak
6. **Blok YKP Kelapa**: 9 Kontak
7. **Blok Gg Niman**: 6 Kontak
8. **Blok Kp Bulak & Kp Sawah**: 6 Kontak
9. **Kategori Usaha / Toko / Warung**: 12 Kontak
10. **Area Umum / Belum Terpetakan**: 71 Kontak

---

## 4. Rekomendasi Template Pesan Blast

Pesan dirancang sopan, personal, dan mengarahkan warga untuk mendaftarkan rumahnya secara resmi ke sistem:

```text
Halo Bapak/Ibu {NAMA_KONTAK} 👋

Salam hangat dari Layanan Pengangkutan Kebersihan Lingkungan — UPS HERU (WastePay Depok). 🚛♻️

Kami menginformasikan bahwa untuk meningkatkan keteraturan jadwal penjemputan sampah dan kemudahan pembayaran iuran di wilayah {WILAYAH}, layanan kini telah terintegrasi secara digital.

Bagi Bapak/Ibu yang belum melengkapi data rumah atau ingin mendaftar layanan pengangkutan sampah rutin (3x seminggu), silakan melakukan pendaftaran mandiri melalui tautan resmi kami:
👉 https://upsheru.com/daftar

Atau dapat mengecek jangkauan area operasional di:
🌐 https://upsheru.com/coverage

Ada pertanyaan atau butuh bantuan pendaftaran? Cukup balas pesan ini ya, tim kami siap membantu. 🙏

Terima kasih atas kerja samanya menjaga kebersihan lingkungan bersama.
— Tim Layanan UPS HERU Depok
```

---

## 5. Prosedur Keamanan Pengiriman (Anti-Banned Policy)

Saat eksekusi penjadwalan blast dilakukan, wajib mematuhi standar berikut:
1. **Jeda Antar Pesan (*Delay*)**: Minimal **4.000 ms - 7.000 ms (4 - 7 detik)** per pesan.
2. **Batching**: Pengiriman dilakukan bertahap maksimal **50 - 60 pesan per jam**.
3. **Pengacakan Variasi Sapaan**: Menggunakan nama kontak asli jika ada, atau sapaan umum jika tanpa nama.
