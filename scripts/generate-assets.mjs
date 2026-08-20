// Menyiapkan aset ikon & splash APK dari logo sumber.
// Hasil: assets/icon.png, assets/splash.png, assets/splash-dark.png
// Lalu jalankan: npx capacitor-assets generate --android
import sharp from "sharp";
import { mkdirSync } from "fs";

const SRC = process.argv[2] || "C:/Users/o2w/Downloads/WhatsApp Image 2026-08-20 at 9.21.31 PM.jpeg";
const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;

async function main() {
  mkdirSync("assets", { recursive: true });
  const img = sharp(SRC).rotate(); // auto-orient sesuai EXIF

  // 1) Ikon (full-bleed)
  await img
    .clone()
    .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
    .png()
    .toFile("assets/icon.png");

  // 2) Logo untuk splash (dikecilkan, dipusatkan)
  const logo = await img
    .clone()
    .resize(Math.round(SPLASH_SIZE * 0.5), Math.round(SPLASH_SIZE * 0.5), {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  // 3) Splash terang (logo di atas putih)
  await sharp({
    create: {
      width: SPLASH_SIZE,
      height: SPLASH_SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile("assets/splash.png");

  // 4) Splash gelap (logo di atas gelap)
  await sharp({
    create: {
      width: SPLASH_SIZE,
      height: SPLASH_SIZE,
      channels: 4,
      background: { r: 17, g: 17, b: 17, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile("assets/splash-dark.png");

  console.log("Aset ikon & splash berhasil dibuat di folder assets/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
