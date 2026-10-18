# Panduan Integrasi Google Contacts (Google People API) WastePay

Sistem WastePay kini terintegrasi penuh dengan **Google Contacts** melalui **Google People API (OAuth 2.0)**. Seluruh data pelanggan aktif di database dapat disinkronkan secara langsung ke buku kontak akun Google/Gmail pilihan Anda.

---

## 📋 Fitur Utama
1. **Sinkronisasi Otomatis ke Akun Google**: Kontak pelanggan langsung tersimpan di Google Contacts akun email yang ditentukan.
2. **Label / Grup Otomatis**: Setiap kontak diberi label **`Pelanggan WastePay`** sehingga terorganisir rapi di Gmail dan aplikasi Kontak HP.
3. **Format Data Lengkap**:
   - **Nama**: `Nama Pelanggan [KodePelanggan]`
   - **Nomor Telepon**: Format internasional E.164 (+62...) siap untuk WhatsApp & panggilan telepon.
   - **Alamat**: Alamat rumah, RT/RW, dan Kelurahan.
   - **Organisasi**: WastePay / Kategori Pelanggan.
   - **Catatan (Notes)**: Kode pelanggan, status aktif/libur, patokan lokasi, nama penanggung jawab, dan koordinat GPS.
4. **Anti-Duplikasi (Idempotent)**: Mendeteksi kontak yang sudah ada berdasarkan Kode Pelanggan dan nomor telepon agar tidak terjadi kontak ganda.
5. **Ekspor Manual Siap Pakai**: Tersedia tombol unduh **Google Contacts CSV** dan **vCard (.vcf)** sebagai opsi alternatif tanpa perlu kredensial Google Cloud.

---

## 🚀 Langkah 1: Mendapatkan Kredensial Google Cloud (Sekali Saja)

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat proyek baru atau pilih proyek yang sudah ada (misal: `WastePay Contacts`).
3. **Aktifkan Google People API**:
   - Masuk ke menu **APIs & Services** → **Library**.
   - Cari **"People API"** (atau `Google People API`).
   - Klik **Enable** (Aktifkan).
4. **Konfigurasi OAuth Consent Screen**:
   - Masuk ke **APIs & Services** → **OAuth consent screen**.
   - Pilih **External** (atau Internal jika memakai Google Workspace domain).
   - Isi Nama Aplikasi: `WastePay`, Email Dukungan: email Anda.
   - Pada bagian **Scopes**, tambahkan:
     - `https://www.googleapis.com/auth/contacts`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Pada bagian **Test Users**, tambahkan alamat email Google yang ingin Anda sinkronkan kontaknya.
5. **Buat Kredensial OAuth 2.0 Client ID**:
   - Masuk ke **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Masukkan **Authorized redirect URIs**:
     - Untuk lokal: `http://localhost:3000/api/integrasi/google-contacts/callback`
     - Untuk server / domain Anda: `https://domain-anda.com/api/integrasi/google-contacts/callback`
   - Klik **Create**. Anda akan mendapatkan **Client ID** dan **Client Secret**.

---

## ⚙️ Langkah 2: Memasukkan Kredensial ke WastePay

Tambahkan variabel berikut ke file `.env` di server/proyek Anda:

```env
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your_google_client_secret_here"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrasi/google-contacts/callback"
```

*(Atau masukkan langsung via database tabel `Pengaturan`)*.

---

## 🔗 Langkah 3: Menghubungkan Akun Google (Email Tujuan)

### Cara A: Melalui Menu Web Admin (Paling Mudah)
1. Buka dashboard WastePay dan masuk ke menu **Pengaturan**.
2. Gulir ke bagian **📇 Google Contacts (Google People API)**.
3. Klik tombol **🔗 Hubungkan Akun Google**.
4. Login menggunakan akun Google/Gmail yang dituju dan klik **Lanjutkan / Izinkan (Allow)**.
5. Sistem akan otomatis menyimpan token dan menampilkan alamat email yang telah tersambung.
6. Klik tombol **🔄 Sinkronkan Kontak ke Google Sekarang**.

---

### Cara B: Melalui Terminal / CLI Script

Jika Anda ingin menjalankan atau menguji via terminal/CLI:

1. **Cek status**:
   ```bash
   node scripts/sync-google-contacts.mjs --status
   ```

2. **Dapatkan URL otorisasi**:
   ```bash
   node scripts/sync-google-contacts.mjs --auth
   ```
   Buka URL yang ditampilkan di browser, login dengan akun Google tujuan, lalu salin kode otorisasi yang diberikan.

3. **Tukar kode otorisasi**:
   ```bash
   node scripts/sync-google-contacts.mjs --code 4/0AbCdEf123...
   ```

4. **Jalankan sinkronisasi**:
   ```bash
   node scripts/sync-google-contacts.mjs --sync
   ```

5. **Pratinjau data sebelum sync (Dry Run)**:
   ```bash
   node scripts/sync-google-contacts.mjs --dry-run
   ```

---

## 📥 Alternatif Cepat: Ekspor File Google Contacts (Tanpa Setup API)

Jika Anda ingin langsung memasukkan kontak hari ini juga tanpa membuat Google Cloud credentials:

1. Masuk ke menu **Pelanggan** → **Cetak / Ekspor** (atau buka `/pelanggan-cetak`).
2. Klik tombol **📇 Google Contacts (.csv)** untuk mengunduh file CSV standar Google.
3. Buka [https://contacts.google.com/](https://contacts.google.com/) pada akun email yang dituju.
4. Klik menu **Impor** (Import) di bilah kiri, lalu pilih file CSV yang baru diunduh.
5. Seluruh kontak pelanggan langsung masuk ke kontak Google dengan label `Pelanggan WastePay`!
