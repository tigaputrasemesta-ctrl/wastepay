@echo off
rem ============================================================
rem  Daftarkan Windows Task Scheduler untuk reminder WhatsApp
rem  (pola skylite.id / Skymedia): tiap hari 09:00 jalankan
rem  scripts\reminder-wa.bat  ->  node scripts/reminder-wa.mjs
rem
rem  Jalankan sebagai Administrator (klik kanan -> Run as administrator).
rem  Cek hasil: schtasks /Query /TN "WastepayReminderWA"
rem  Hapus:     schtasks /Delete /TN "WastepayReminderWA" /F
rem ============================================================

set "PROJECT_DIR=C:\Users\Administrator\Projects\wastepay"

schtasks /Create /TN "WastepayReminderWA" /TR "\"%PROJECT_DIR%\scripts\reminder-wa.bat\"" /SC DAILY /ST 09:00 /F

if %ERRORLEVEL%==0 (
    echo.
    echo [OK] Task "WastepayReminderWA" terdaftar - setiap hari 09:00.
    echo      Cek dengan: schtasks /Query /TN "WastepayReminderWA"
) else (
    echo.
    echo [GAGAL] Pastikan dijalankan sebagai Administrator.
)
pause
