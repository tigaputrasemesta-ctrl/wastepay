# APK O2W Lapangan — Background GPS, Update & Logo

## Ringkasan perubahan (v1.2.0, versionCode 12)

1. **Background GPS** — posisi petugas tetap terkirim saat aplikasi di-background
   atau layar HP terkunci (sebelumnya hanya aktif saat aplikasi di depan).
2. **Sistem update** — aplikasi mengecek versi terbaru ke `/api/mobile/version`
   dan menampilkan dialog "Versi Baru" + tombol unduh APK.
3. **Logo baru** — ikon & splash dibuat dari logo yang diberikan (folder `assets/`).

## Cara kerja background GPS

- Memakai plugin `@capacitor-community/background-geolocation` (native Android
  foreground service).
- Saat petugas login, aplikasi meminta token (`POST /api/mobile/tracking-token`)
  lalu memulai watcher. Setiap perpindahan ≥ 50 m, posisi dikirim ke
  `POST /api/mobile/tracking` lewat **CapacitorHttp** (HTTP native, tidak
  kena throttle WebView setelah 5 menit).
- Token tersimpan di kolom `Petugas.trackingToken` (unik per petugas).

## ⚠️ Batasan penting (harus dipahami)

### 1. "Diam tanpa notifikasi" TIDAK 100% mungkin di Android
Android 8+ **mewajibkan** notifikasi kecil (foreground service) selama GPS
background aktif. Yang bisa dilakukan:
- Channel dibuat **senyap** (tanpa suara, tanpa getar) — sudah diterapkan.
- Di **Android 13+**, kalau izin notifikasi (`POST_NOTIFICATIONS`) tidak pernah
  diminta/diberikan, notifikasi otomatis **tidak tampil** → efeknya "diam".
  (Di Android 8–12 notifikasi tetap muncul; tidak bisa dihilangkan.)

### 2. "Aplikasi ditutup" = di-background / layar terkunci
- ✅ **Berfungsi** saat: tombol Home, pindah aplikasi, layar terkunci.
- ⚠️ **Bisa berhenti** saat: user **swipe-away** dari recent apps atau **force
  stop** di Pengaturan (ini kebijakan OS, semua aplikasi sama). Buka aplikasi
  sekali lagi untuk memulai ulang.
- ❌ Tidak otomatis mulai ulang setelah **reboot HP** (harus buka aplikasi dulu).
  Untuk survive full-kill + boot, perlu plugin berbayar
  `@transistorsoft/capacitor-background-geolocation` atau service native custom.

### 3. Izin lokasi "Sepanjang waktu"
Di Android 11+, agar GPS jalan di background, izin lokasi harus **"Allow all
the time"**. Jika belum, aplikasi menampilkan tombol **"Buka Pengaturan"**
(di bar BG GPS) untuk mengubahnya.

## Build APK (perlu Android Studio / SDK di komputer)

> Repo ini hanya berisi kode & konfigurasi. APK dibuild di komputer yang punya
> Java + Android SDK (seperti saat membangun v1.1).

```bash
npm install          # install plugin baru
npx cap sync android # sinkronisasi native plugin ke proyek Android
npx cap open android # buka di Android Studio, lalu Build > Build APK(s)
```

Alternatif CLI (bila Android SDK tersedia):

```bash
cd android
./gradlew assembleDebug        # APK debug
./gradlew assembleRelease      # APK release (perlu signing)
```

### YA, PERLU DI-INSTALL ULANG
Fitur baru ini menambah **permission native, service, dan plugin** — tidak bisa
didapat lewat update web biasa. Petugas harus **install APK v1.2.0** (menimpa
v1.1). Update APK berikutnya akan terdeteksi otomatis oleh sistem update.

## Sistem update / versi

- Sumber versi: `src/lib/mobile-version.ts` (`versionName`, `versionCode`,
  `minVersionCode`, `changelog`).
- Endpoint: `GET /api/mobile/version`.
- URL APK: set env **`MOBILE_APK_URL`** (mis. di Vercel) ke URL file APK terbaru
  (upload APK ke public host / GitHub Releases / penyimpanan lain). Kosong =
  tombol unduh nonaktif.

### Naik versi (contoh ke 1.3.0)
Ubah **KEDUA** tempat ini agar sinkron:
1. `android/app/build.gradle` → `versionCode` & `versionName`.
2. `src/lib/mobile-version.ts` → `versionCode` & `versionName` (samakan).

Lalu build APK, host file-nya, set `MOBILE_APK_URL`, deploy web.

## Regenerasi ikon/splash

```bash
node scripts/generate-assets.mjs "<path/logo.jpg>"  # hasil ke assets/
npx capacitor-assets generate --android
```
