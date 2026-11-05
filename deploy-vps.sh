#!/usr/bin/env bash
set -e

VPS_IP="43.173.40.166"
VPS_USER="ubuntu"
VPS_PASS="@Jawabarat2027"

echo "🚀 Memulai sinkronisasi dan deploy ke VPS SumoPod ($VPS_IP)..."

# 1. Pastikan commit lokal sudah ter-push
git push origin master || true
git push origin main || true

# 2. Sinkronisasi file konfigurasi utama
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no Dockerfile .dockerignore docker-compose.yml next.config.ts "$VPS_USER@$VPS_IP:/home/$VPS_USER/wastepay/"

# 3. Pull & Rebuild di VPS
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no "$VPS_USER@$VPS_IP" "cd /home/$VPS_USER/wastepay && git pull origin master && docker compose up -d --build"

echo "✅ Deploy selesai! Cek aplikasi di http://$VPS_IP:3000 atau http://$VPS_IP"
