@echo off
REM Build APK debug internal (sideload) untuk O2W Lapangan.
REM Requirement: JDK 17+, Android SDK (API 35), dan env ANDROID_HOME / ANDROID_SDK_ROOT.
REM
REM Jalankan dari root project:
REM   scripts\build-apk.bat
REM
REM Output APK: android\app\build\outputs\apk\debug\app-debug.apk

echo ==^> [1/3] Sync web assets ^& config Capacitor ke project Android
call npx cap sync android

echo ==^> [2/3] Build APK debug (Gradle)
cd android
call gradlew.bat assembleDebug --no-daemon
cd ..

echo.
echo ==^> Selesai
echo APK tersedia di: android\app\build\outputs\apk\debug\app-debug.apk
echo Salin file tersebut ke HP Android petugas, lalu install (izinkan 'install dari sumber tidak dikenal').
