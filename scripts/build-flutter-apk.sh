#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/6] Menyiapkan Java 21 LTS..."
export JAVA_HOME="/usr/local/sdkman/candidates/java/21.0.12+1-ms"
export PATH="$JAVA_HOME/bin:$PATH"
java -version

echo "==> [2/6] Mengunduh Android Command Line Tools..."
mkdir -p /home/codespace/android-sdk/cmdline-tools
if [ ! -d "/home/codespace/android-sdk/cmdline-tools/latest" ]; then
  curl -fsSL -o /home/codespace/cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q -o /home/codespace/cmdline-tools.zip -d /home/codespace/android-sdk/cmdline-tools/
  rm -rf /home/codespace/android-sdk/cmdline-tools/latest
  mv /home/codespace/android-sdk/cmdline-tools/cmdline-tools /home/codespace/android-sdk/cmdline-tools/latest
  rm -f /home/codespace/cmdline-tools.zip
fi

export ANDROID_HOME="/home/codespace/android-sdk"
export ANDROID_SDK_ROOT="/home/codespace/android-sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "==> [3/6] Menerima lisensi Android SDK..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true

echo "==> [4/6] Mengunduh platform Android 34 & build-tools..."
sdkmanager "platforms;android-34" "build-tools;34.0.0" "platform-tools" > /dev/null

echo "==> [5/6] Mengonfigurasi Flutter SDK..."
flutter config --android-sdk /home/codespace/android-sdk

echo "==> [6/6] Mengompilasi APK Flutter Native (mobile_petugas)..."
cd /workspaces/codespaces-blank/mobile_petugas
flutter build apk --release

mkdir -p /workspaces/codespaces-blank/public/apk
cp build/app/outputs/flutter-apk/app-release.apk /workspaces/codespaces-blank/public/apk/UPS-HERU-Petugas-Native.apk

echo "==> SUKSES! File APK Native siap di: /workspaces/codespaces-blank/public/apk/UPS-HERU-Petugas-Native.apk"
