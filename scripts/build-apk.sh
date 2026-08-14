#!/usr/bin/env bash
# Build APK debug internal (sideload) untuk O2W Lapangan.
# Requirement: JDK 17+, Android SDK (API 35), dan env ANDROID_HOME / ANDROID_SDK_ROOT.
#
# Jalankan dari root project:
#   bash scripts/build-apk.sh
#
# Output APK: android/app/build/outputs/apk/debug/app-debug.apk

set -euo pipefail

echo "==> [1/3] Sync web assets & config Capacitor ke project Android"
npx cap sync android

echo "==> [2/3] Build APK debug (Gradle)"
cd android
./gradlew assembleDebug --no-daemon

cd ..
echo ""
echo "==> Selesai ✓"
echo "APK tersedia di: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Salin file tersebut ke HP Android petugas, lalu install (izinkan 'install dari sumber tidak dikenal')."
