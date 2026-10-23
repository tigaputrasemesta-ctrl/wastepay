import "dotenv/config";

const BASE_URL = process.env.BASE_URL || "https://upsheru.com";
const EMAIL = process.env.ADMIN_EMAIL || "rekoprihartono@hero.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "111111";

// Pemetaan 23 Zona ke nama asli (Blok/Zona) dan street name (disimpan di keterangan)
export const ZONA_RESTORE_MAP = [
  { id: 14, nama: "BLOK BAKUNG", street: "Jl. Bakung Raya", kelurahan: "Cilodong" },
  { id: 15, nama: "BLOK JL RAYA BAKUNG", street: "Jl. Kemang Raya", kelurahan: "Cilodong" },
  { id: 22, nama: "BLOK JL RAYA KEBON DUREN", street: "Jl. Raya Kebon Duren", kelurahan: "Jatimulya" },
  { id: 23, nama: "BLOK KAMPUNG SAWAH", street: "Jl. Raya Kampung Sawah", kelurahan: "Jatimulya" },
  { id: 24, nama: "BLOK SAMIT", street: "Jl. Samit", kelurahan: "Jatimulya" },
  { id: 10, nama: "BLOK H PUAH", street: "Gang H. Puah", kelurahan: "Kalibaru" },
  { id: 4,  nama: "BLOK BAWAH DMILES + SMP 6", street: "Jl. SMPN 6 Depok", kelurahan: "Kalibaru" },
  { id: 11, nama: "BLOK GG MENTENG", street: "Gang Menteng", kelurahan: "Kalibaru" },
  { id: 16, nama: "BLOK GG NIMAN", street: "Gang Niman", kelurahan: "Kalibaru" },
  { id: 6,  nama: "BLOK GG PECEL", street: "Gang Pecel", kelurahan: "Kalibaru" },
  { id: 12, nama: "BLOK GG SUCI", street: "Gang Suci", kelurahan: "Kalibaru" },
  { id: 7,  nama: "BLOK GG UMAR", street: "Gang H. Umar", kelurahan: "Kalibaru" },
  { id: 2,  nama: "BLOK JALAN RAYA CILODONG", street: "Jl. Raya Cilodong", kelurahan: "Kalibaru" },
  { id: 25, nama: "BLOK KIBENG", street: "Gang Kibeng", kelurahan: "Kalibaru" },
  { id: 13, nama: "BLOK KP BULAK", street: "Jl. Rajawali", kelurahan: "Kalibaru" },
  { id: 18, nama: "BLOK PERUM BMK", street: "Jl. Masjid Nurul Yaqin", kelurahan: "Kalibaru" },
  { id: 17, nama: "BLOK PERUM SANTRI", street: "Jl. Santri Kalibaru", kelurahan: "Kalibaru" },
  { id: 8,  nama: "BLOK SETU + RAFAEL PETE", street: "Jl. Berkah Raya", kelurahan: "Kalibaru" },
  { id: 26, nama: "BLOK THR", street: "Jl. THR", kelurahan: "Kalibaru" },
  { id: 19, nama: "BLOK YKP KELAPA", street: "Jl. H. Nirun", kelurahan: "Kalibaru" },
  { id: 9,  nama: "GG SARIN", street: "Gang Sarin", kelurahan: "Kalibaru" },
  { id: 20, nama: "BLOK SASAK", street: "Jl. Raya Kalimulya", kelurahan: "Kalimulya" },
  { id: 21, nama: "BLOK TABRONI", street: "Jl. Tabroni", kelurahan: "Kalimulya" },
];

async function main() {
  const isApply = process.argv.includes("--apply");
  console.log(`🚀 Menjalankan restore nama zona ke ${BASE_URL}...`);
  console.log(`Mode: ${isApply ? "EKSEKUSI (WRITE)" : "DRY-RUN (SIMULASI)"}\n`);

  // 1. Login
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!loginRes.ok) {
    console.error("❌ Login gagal:", loginRes.status);
    process.exit(1);
  }

  const cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
  console.log("✅ Berhasil login sebagai Superadmin.\n");

  // 2. Fetch current zonas
  const zonaRes = await fetch(`${BASE_URL}/api/zona`, { headers: { cookie } });
  const currentZonas = await zonaRes.json();
  const currentMap = new Map(currentZonas.map((z) => [z.id, z]));

  let updatedCount = 0;

  for (const item of ZONA_RESTORE_MAP) {
    const existing = currentMap.get(item.id);
    if (!existing) {
      console.warn(`⚠️ Zona ID ${item.id} tidak ditemukan di server!`);
      continue;
    }

    const needsUpdate = existing.nama !== item.nama || existing.keterangan !== item.street;
    console.log(
      `Zona #${item.id} [${item.kelurahan}]:\n  Current: "${existing.nama}" (ket: "${existing.keterangan || "-"}")\n  Target : "${item.nama}" (ket: "${item.street}")`
    );

    if (needsUpdate) {
      if (isApply) {
        const putRes = await fetch(`${BASE_URL}/api/zona/${item.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            cookie,
          },
          body: JSON.stringify({
            nama: item.nama,
            keterangan: item.street,
            warna: existing.warna,
            kelurahanId: existing.kelurahanId,
          }),
        });

        if (putRes.ok) {
          console.log(`  -> ✅ Berhasil di-update!`);
          updatedCount++;
        } else {
          console.error(`  -> ❌ Gagal update: HTTP ${putRes.status}`);
        }
      } else {
        console.log(`  -> [DRY-RUN] Akan diperbarui.`);
        updatedCount++;
      }
    } else {
      console.log(`  -> [SKIP] Sudah sesuai.`);
    }
    console.log("");
  }

  console.log(`\nSelesai! Total zona ${isApply ? "di-update" : "perlu update"}: ${updatedCount}/${ZONA_RESTORE_MAP.length}`);

  if (isApply) {
    // Verifikasi data pelanggan
    console.log("\nMemverifikasi data pelanggan...");
    const pelRes = await fetch(`${BASE_URL}/api/pelanggan?limit=5`, { headers: { cookie } });
    if (pelRes.ok) {
      const pelData = await pelRes.json();
      const list = pelData.pelanggan || pelData;
      console.log("Contoh 5 data pelanggan setelah restore:");
      list.slice(0, 5).forEach((p) => {
        console.log(`- ${p.nama} (${p.kodePelanggan}) -> Zona: ${p.wilayah?.zona?.nama || "Tanpa Zona"}`);
      });
    }
  } else {
    console.log("\n💡 Untuk menerapkan perubahan, jalankan dengan argumen --apply:");
    console.log("node scripts/restore-zona-names.mjs --apply");
  }
}

main().catch(console.error);
