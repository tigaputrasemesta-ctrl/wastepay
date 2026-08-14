# APK Internal — O2W Lapangan

APK Android untuk **petugas lapangan** (angkut, survei, tagih). Sumber data & logika
tetap dari aplikasi web WastePay (Next.js) — APK hanya "shell" Android yang memuat
aplikasi web, sehingga data live dan pekerjaan lapangan lebih mudah.

## Cara kerja

- APK memuat URL aplikasi web yang sudah di-deploy (lihat `capacitor.config.ts` → `server.url`).
- Saat dibuka, langsung menuju dashboard mobile `/m` (bukan landing page publik).
- Login pakai akun petugas yang sama dengan web (email + password).
- Semua data dibaca/ditulis lewat REST API yang sudah ada di aplikasi web.

## Fitur (route mobile `/m`)

| Route | Fitur | API yang dipakai |
|---|---|---|
| `/m` | Dashboard & menu cepat | `/api/petugas/me`, `/api/absensi`, `/api/pengangkutan`, `/api/pelanggan` |
| `/m/absen` | Absensi masuk/selesai + GPS | `/api/absensi` |
| `/m/angkut` | Tugas angkut harian, tandai pickup (foto + volume/berat), live GPS tracking | `/api/pengangkutan`, `/api/kendaraan`, `/api/petugas/lokasi`, `/api/kendaraan/lokasi` |
| `/m/survei` | Survei calon pelanggan: foto geotag (EXIF) + GPS + aktifkan | `/api/pelanggan` |
| `/m/klaim` | Klaim BBM/perawatan + foto bukti | `/api/klaim` |

Menu bawah (Beranda/Angkut/Survei/Klaim/Absen) otomatis menyesuaikan jabatan petugas
(`angkut`, `survei`, dst).

## Build APK (sideload)

Requirement di mesin build:

- JDK 17+
- Android SDK (API 35) + env `ANDROID_HOME` / `ANDROID_SDK_ROOT`
- (opsional) Android Studio untuk debug/emulator

### 1. Sinkronkan & build

```bash
# dari root project
bash scripts/build-apk.sh
# atau di Windows (cmd):
scripts\build-apk.bat
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Install di HP Android

1. Salin `app-debug.apk` ke HP (WA/Drive/USB).
2. Buka file → izinkan **"Install dari sumber tidak dikenal"**.
3. Buka aplikasi **O2W Lapangan**, login dengan akun petugas.

> APK debug tidak butuh signing Play Store — cocok untuk internal/sideload.
> Ganti nama/ikon bila perlu di `android/app/src/main/res/` sebelum build.

## Mengubah URL backend

Saat deploy ke domain baru, override lewat env saat sync/build:

```bash
CAPACITOR_URL="https://domain-baru.example.com" npx cap sync android
```

Atau edit `server.url` di `capacitor.config.ts` lalu `npx cap sync android`.

## Izin native (sudah dikonfigurasi)

- `INTERNET` — akses API
- `CAMERA` — foto rumah (survei), foto bukti pickup/klaim
- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — absensi GPS, geotag, live tracking

## Catatan teknis

- Foto dikompres ke JPEG base64 (maks 1024px) sebelum dikirim — hemat data & storage
  (sama seperti komponen web `GeotagPhoto`).
- Koordinat foto diambil dari EXIF bila ada, fallback ke GPS perangkat.
- Live GPS mengirim posisi tiap 10 detik ke `/api/petugas/lokasi` (+ `/api/kendaraan/lokasi`
  bila petugas memilih kendaraan) — tampil realtime di peta admin web.
