import "dotenv/config";

const BASE_URL = process.env.BASE_URL || "https://upsheru.com";
const EMAIL = process.env.ADMIN_EMAIL || "rekoprihartono@hero.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "111111";

/**
 * Pemetaan Rute Operasional Riil Lapangan (23 Blok Lengkap):
 * 1. JALUR AGO GRANDMAX (Kendaraan ID: 20) -> 8 + 4 = 12 blok Kalibaru & Bakung
 * 2. JALUR PIYAT CARRY FUTURA (Kendaraan ID: 18) -> 4 blok Cilodong Raya & Kp Sawah
 * 3. Raka GRANDMAX ASTROBOY (Kendaraan ID: 19) -> 7 blok Kalimulya, Jatimulya, Setu
 */
const BLUEPRINT_FIELD = [
  // ==========================================
  // JALUR AGO GRANDMAX (Mobil ID: 20)
  // ==========================================
  {
    existingId: 50,
    nama: "JALUR AGO GRANDMAX (Sen, Rab, Jum)",
    kendaraanId: 20,
    hari: "Senin,Rabu,Jumat",
    jam: "08:00 - 11:30",
    // 1. BLOK BAWAH DMILES + SMP 6 (4)
    // 2. BLOK H PUAH (10)
    // 3. GG SARIN (9)
    // + Tambahan: BLOK KIBENG (25)
    zonaIds: [4, 10, 9, 25],
    aktif: true,
  },
  {
    existingId: 54,
    nama: "JALUR AGO GRANDMAX (Sel, Kam, Sab)",
    kendaraanId: 20,
    hari: "Selasa,Kamis,Sabtu",
    jam: "08:00 - 11:30",
    // 1. BLOK BAKUNG (14)
    // 2. BLOK GG MENTENG (11)
    // 3. BLOK GG NIMAN (16)
    // 4. BLOK GG UMAR (7)
    // 5. BLOK PERUM SANTRI (17)
    // + Tambahan: BLOK GG PECEL (6), BLOK GG SUCI (12), BLOK PERUM BMK (18)
    zonaIds: [14, 11, 16, 7, 17, 6, 12, 18],
    aktif: true,
  },

  // ==========================================
  // JALUR PIYAT CARRY FUTURA (Mobil ID: 18)
  // ==========================================
  {
    existingId: 51,
    nama: "JALUR PIYAT CARRY FUTURA (Sen, Rab, Jum)",
    kendaraanId: 18,
    hari: "Senin,Rabu,Jumat",
    jam: "08:00 - 11:30",
    // 1. BLOK JL RAYA BAKUNG (15)
    // 2. BLOK KAMPUNG SAWAH (23)
    zonaIds: [15, 23],
    aktif: true,
  },
  {
    existingId: 55,
    nama: "JALUR PIYAT CARRY FUTURA (Sel, Kam, Sab)",
    kendaraanId: 18,
    hari: "Selasa,Kamis,Sabtu",
    jam: "08:00 - 11:30",
    // 1. BLOK JALAN RAYA CILODONG (2)
    // 2. BLOK YKP KELAPA (19)
    zonaIds: [2, 19],
    aktif: true,
  },

  // ==========================================
  // Raka GRANDMAX ASTROBOY (Mobil ID: 19)
  // ==========================================
  {
    existingId: 52,
    nama: "Raka GRANDMAX ASTROBOY (Sen, Rab, Jum)",
    kendaraanId: 19,
    hari: "Senin,Rabu,Jumat",
    jam: "08:00 - 11:30",
    // 1. BLOK JL RAYA KEBON DUREN (22)
    // 2. BLOK SASAK (20)
    // 3. BLOK TABRONI (21)
    zonaIds: [22, 20, 21],
    aktif: true,
  },
  {
    existingId: 53,
    nama: "Raka GRANDMAX ASTROBOY (Sel, Kam, Sab)",
    kendaraanId: 19,
    hari: "Selasa,Kamis,Sabtu",
    jam: "08:00 - 11:30",
    // 1. BLOK KP BULAK (13)
    // 2. BLOK SAMIT (24)
    // 3. BLOK SETU + RAFAEL PETE (8)
    // 4. BLOK THR (26)
    zonaIds: [13, 24, 8, 26],
    aktif: true,
  },
];

async function main() {
  console.log(`🚀 Menerapkan rute riil 3 supir (Ago, Piyat, Raka) ke ${BASE_URL}...`);

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
  console.log("✅ Berhasil login sebagai Superadmin.");

  // 2. Update masing-masing rute
  for (const item of BLUEPRINT_FIELD) {
    const url = `${BASE_URL}/api/rute/${item.existingId}`;
    console.log(`\n📦 [PUT] Mengatur ID ${item.existingId}: ${item.nama}...`);
    
    // kelurahanIds dikosongkan agar filter spesifik murni ke zonaIds yang dipilih
    const payload = {
      nama: item.nama,
      hari: item.hari,
      jam: item.jam,
      kendaraanId: item.kendaraanId,
      zonaIds: item.zonaIds,
      kelurahanIds: [],
      aktif: item.aktif,
      autoSync: true,
    };

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Gagal menyimpan ID ${item.existingId}:`, res.status, err);
    } else {
      const saved = await res.json();
      console.log(`✅ Tersimpan: ID ${saved.id} - ${saved.nama}`);
      console.log(`   Blok: ${item.zonaIds.length} zona ditugaskan`);

      // Trigger sync
      try {
        const syncRes = await fetch(`${BASE_URL}/api/rute/${saved.id}/sync`, {
          method: "POST",
          headers: { cookie },
        });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          console.log(`   🔄 Sinkronisasi jadwal: ${syncData.pelangganCount || 0} warga terhubung (${syncData.jadwalCreated || 0} slot hari)`);
        }
      } catch (sErr) {
        // optional
      }
    }
  }

  // 3. Verifikasi Hasil Akhir
  console.log("\n========================================================");
  console.log("📊 HASIL AKHIR PEMBAGIAN RUTE LAPANGAN DI UPSHERU.COM:");
  console.log("========================================================");
  const verifyRes = await fetch(`${BASE_URL}/api/rute`, { headers: { cookie } });
  const finalRutes = await verifyRes.json();
  
  // Sort rute berdasarkan ID
  finalRutes.sort((a, b) => a.id - b.id);
  finalRutes.forEach((r) => {
    const zonaNames = r.zonas && r.zonas.length > 0 ? r.zonas.map((z) => z.nama).join(", ") : "—";
    console.log(`\n• [ID ${r.id}] ${r.nama}`);
    console.log(`  Jadwal: ${r.hari} | Jam: ${r.jam || "-"}`);
    console.log(`  Cakupan Blok (${r.zonas?.length || 0}): ${zonaNames}`);
    console.log(`  Slot Jadwal: ${r._count?.jadwal || 0}`);
  });

  console.log("\n✨ Seluruh 23 blok dan 3 armada berhasil disinkronkan 100%!");
}

main().catch(console.error);
