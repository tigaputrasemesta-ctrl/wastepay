@echo off
REM ============================================
REM Wastepay Database Backup Script
REM Run daily via Task Scheduler
REM ============================================

set DB_DIR=C:\Users\Administrator\Projects\wastepay
set BACKUP_DIR=%DB_DIR%\backups
set DATE=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%

REM Create backup directory if not exists
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Copy database file with date stamp
copy "%DB_DIR%\dev.db" "%BACKUP_DIR%\dev_%DATE%.db" /Y

REM Copy with journal if exists
if exist "%DB_DIR%\dev.db-journal" (
    copy "%DB_DIR%\dev.db-journal" "%BACKUP_DIR%\dev_%DATE%.db-journal" /Y
)

REM Compress old backups (older than 30 days)
echo Backing up to: %BACKUP_DIR%\dev_%DATE%.db

REM Clean up backups older than 90 days
forfiles /p "%BACKUP_DIR%" /m *.db /d -90 /c "cmd /c del @path" 2>nul

echo Backup selesai: %DATE%
