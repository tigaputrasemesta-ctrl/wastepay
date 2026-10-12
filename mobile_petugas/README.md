# UPS HERU Lapangan — Aplikasi Android Flutter 🚛📱

Aplikasi mobile native Android berbasis **Flutter** khusus untuk **Petugas Lapangan** platform pengelolaan sampah **UPS HERU** (Unit Pengolahan Sampah HERU - Kota Depok).

Aplikasi ini berinteraksi langsung dengan REST API backend WastePay/Next.js menggunakan protokol otorisasi `Authorization: Bearer <JWT_TOKEN>`.

---

## 🎯 Fitur Lengkap Aplikasi

### 1. 🔐 Autentikasi & Manajemen Sesi
- Login aman berbasis email & kata sandi petugas lapangan.
- Penyimpanan sesi JWT aman via `flutter_secure_storage` & `shared_preferences`.
- Fleksibilitas pemilihan alamat server backend (Production `https://o2whero.com` atau Custom IP dev/staging).
- Auto-login & persistensi sesi saat membuka aplikasi.

### 2. ⏱️ Absensi Geotag & Kamera Selfie
- Pengambilan foto wajah selfie petugas langsung dari kamera depan.
- Pembacaan sensor koordinat GPS perangkat (Latitude, Longitude, Akurasi) untuk mencegah fake GPS.
- Pencatatan **Absen Masuk** dan **Absen Pulang** (Selesai Tugas).

### 3. 🚛 Tugas Pengangkutan Sampah Harian
- Sinkronisasi daftar tugas harian rute armada petugas (`/api/pengangkutan?saya=1`).
- Filter status cepat: **Semua**, **Terjadwal**, **Selesai (Diambil)**, **Dilewati/Kosong**.
- Pencarian instan berdasarkan nama warga, alamat, atau ID pelanggan.
- **1-Tap Quick Pickup**: Sekali ketuk untuk menyelesaikan tugas pengambilan sampah dengan pencatatan GPS otomatis.
- **Lewati Konsumen**: Alur untuk melewati rumah kosong atau rumah dengan tunggakan iuran belum lunas.
- **Integrasi Navigasi**: Tombol langsung membuka titik lokasi pelanggan di Google Maps (`Turn-by-turn Navigation`).
- **Hubungi Pelanggan**: Tombol langsung panggilan telepon ke warga.
- Form detail pencatatan volume ($m^3$), berat ($kg$), jenis sampah (organik, anorganik, b3, campuran), dan foto bukti pengambilan.

### 4. 📸 Survei Geotag Calon Warga Baru
- Daftar calon pelanggan di kelurahan petugas yang mendaftar mandiri via web portal (`/daftar`).
- Hubungi calon warga via tombol WhatsApp langsung.
- Verifikasi lapangan dengan pengambilan foto depan rumah / pagar dan penguncian koordinat GPS akurat.
- Aktivasi status calon warga menjadi pelanggan aktif.

### 5. 📍 Live GPS Fleet Tracking (Beacon Truk)
- Saklar toggle untuk mengaktifkan pancaran sinyal GPS armada truk sampah ke kantor operasional dan peta live warga (`/lacak`).
- Pengiriman periodik telemetri GPS (koordinat, kecepatan laju $km/jam$, arah/heading, dan estimasi akurasi).

### 6. ⚠️ Lapor Kendala Lapangan
- Pelaporan darurat saat menghadapi kendala di rute (jalan ditutup/portal, truk mogok, sampah liar ekstrem) disertai foto bukti.

---

## 📁 Struktur Direktori

```text
mobile_petugas/
├── android/                        # Konfigurasi native Android (Gradle, Manifest, Permissions)
├── lib/
│   ├── core/
│   │   ├── constants/              # ApiEndpoints, AppColors
│   │   ├── network/                # ApiClient (HTTP + Bearer Token + Exception Handling)
│   │   ├── storage/                # TokenStorage (Secure Storage & Shared Preferences)
│   │   └── theme/                  # Material 3 Theme & Styling
│   ├── models/                     # Data models (User, Petugas, Absensi, Tugas, Calon)
│   ├── providers/                  # State management (Provider: Auth, Absensi, Pengangkutan, Survei, Tracking)
│   ├── services/                   # Service API calls ke backend Next.js
│   ├── screens/
│   │   ├── auth/                   # LoginScreen
│   │   ├── dashboard/              # DashboardScreen
│   │   ├── absensi/                # AbsensiScreen (Kamera Selfie + GPS)
│   │   ├── pengangkutan/           # PengangkutanListScreen & DetailScreen
│   │   ├── survei/                 # SurveiListScreen & DetailScreen (Geotag Warga)
│   │   ├── tracking/               # LiveTrackingScreen (GPS Beacon Armada)
│   │   └── komplain/               # LaporKendalaScreen
│   ├── widgets/                    # CustomButton, CustomTextField, StatusBadge, TaskCard
│   └── main.dart                   # Entry point aplikasi & AuthGate
├── analysis_options.yaml           # Linting rules
└── pubspec.yaml                    # Dependensi Flutter
```

---

## 🚀 Panduan Menjalankan & Build

### 1. Prasyarat Lingkungan
- Flutter SDK (versi >= 3.0.0)
- Android SDK & Java JDK 17+
- Device Android fisik atau Emulator

### 2. Mengunduh Dependensi
```bash
cd mobile_petugas
flutter pub get
```

### 3. Menjalankan di Device / Emulator
```bash
flutter run
```

### 4. Build File APK Siap Rilis (Production)
```bash
flutter build apk --release
```
Hasil file APK rilis akan tersedia di:
`build/app/outputs/flutter-apk/app-release.apk`

Untuk paket Android App Bundle (AAB) Google Play Store:
```bash
flutter build appbundle --release
```

---

## 🔐 Izin Perangkat (Android Permissions)
File `AndroidManifest.xml` telah dikonfigurasi dengan izin lengkap:
- `android.permission.INTERNET` & `ACCESS_NETWORK_STATE`
- `android.permission.CAMERA` (Selfie absensi & bukti pengambilan sampah)
- `android.permission.ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION` (Geotagging & rute)
- `android.permission.ACCESS_BACKGROUND_LOCATION` & `WAKE_LOCK` (Live GPS tracking armada)
