@echo off
rem ============================================================
rem  Reminder + auto-generate tagihan WhatsApp (pola skylite.id / Skymedia)
rem  Dipanggil oleh Windows Task Scheduler tiap hari 09:00.
rem  - Tanggal 1: buat tagihan bulan berjalan + kirim WA invoice
rem  - H-3/H-1 jatuh tempo: reminder; lewat jatuh tempo: tunggakan + denda
rem  Log: reminder-wa.log di folder proyek.
rem ============================================================
cd /d "C:\Users\Administrator\Projects\wastepay"
node scripts/reminder-wa.mjs >> reminder-wa.log 2>&1
