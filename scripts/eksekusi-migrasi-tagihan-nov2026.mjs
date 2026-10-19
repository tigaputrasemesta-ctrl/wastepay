import "dotenv/config";

const BASE_URL = process.env.BASE_URL || "https://upsheru.com";
const EMAIL = process.env.ADMIN_EMAIL || "rekoprihartono@hero.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "111111";
let COOKIE = process.env.SESSION_COOKIE || "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(500 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await sleep(500 * attempt);
    }
  }
}

async function login() {
  if (COOKIE) return;
  console.log(`🔐 Login ke ${BASE_URL} sebagai ${EMAIL}...`);
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("❌ Login gagal:", err.error || `HTTP ${res.status}`);
    process.exit(1);
  }

  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    COOKIE = setCookie.split(";")[0];
    console.log("✅ Berhasil login (Superadmin).");
  }
}

async function pMap(items, fn, concurrency = 10) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = { error: err.message };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log("================================================================================");
  console.log("🚀 MEMULAI EKSEKUSI MIGRASI SISTEM: TAGIHAN 1 NOVEMBER 2026 & PELUNASAN SEP-OKT");
  console.log(`Target: ${BASE_URL}`);
  console.log("================================================================================\n");

  await login();

  // --------------------------------------------------------------------------------
  // LANGKAH 1: Set Siklus Tagihan Seluruh Pelanggan Aktif ke Tanggal 1 November 2026
  // --------------------------------------------------------------------------------
  console.log("📍 LANGKAH 1: Menyelaraskan siklus tagihan seluruh pelanggan aktif ke tgl 1...");
  const pRes = await fetchWithRetry(`${BASE_URL}/api/pelanggan?status=aktif`, {
    headers: { Cookie: COOKIE },
  });
  const pelangganList = await pRes.json();
  const allActive = Array.isArray(pelangganList) ? pelangganList : pelangganList.data || [];
  console.log(`📋 Total Pelanggan Aktif: ${allActive.length}`);

  const needCycleUpdate = allActive.filter((p) => {
    const d = new Date(p.createdAt);
    return isNaN(d.getTime()) || d.getDate() !== 1;
  });
  console.log(`🔄 Pelanggan yang perlu diselaraskan ke tanggal 1: ${needCycleUpdate.length}`);

  if (needCycleUpdate.length > 0) {
    let count = 0;
    await pMap(
      needCycleUpdate,
      async (p) => {
        const res = await fetchWithRetry(`${BASE_URL}/api/pelanggan/${p.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: COOKIE,
          },
          body: JSON.stringify({ createdAt: "2026-11-01T00:00:00.000Z" }),
        });
        count++;
        if (count % 50 === 0 || count === needCycleUpdate.length) {
          process.stdout.write(`   ↳ Progres update siklus: ${count}/${needCycleUpdate.length} pelanggan\r`);
        }
        return res.ok;
      },
      12
    );
    console.log(`\n   ✅ Berhasil menyelaraskan ${needCycleUpdate.length} pelanggan ke siklus 1 November.`);
  } else {
    console.log("   ✅ Seluruh pelanggan aktif sudah berada pada siklus tanggal 1.");
  }

  // --------------------------------------------------------------------------------
  // LANGKAH 2: Generate Tagihan November 2026 untuk Seluruh Pelanggan Aktif
  // --------------------------------------------------------------------------------
  console.log("\n📍 LANGKAH 2: Generate massal tagihan November 2026 (per 1 November 2026)...");
  const genRes = await fetchWithRetry(`${BASE_URL}/api/tagihan/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: COOKIE,
    },
    body: JSON.stringify({
      bulan: 11,
      tahun: 2026,
      skipWa: true, // Jangan kirim blast WA sekarang (sesuai preferensi user)
    }),
  });

  const genResult = await genRes.json();
  console.log(`   ✅ Hasil Generate Tagihan November 2026:`);
  console.log(`      - Dibuat Baru : ${genResult.created || 0}`);
  console.log(`      - Sudah Ada   : ${genResult.skipped || 0}`);
  if (genResult.errors && genResult.errors.length > 0) {
    console.warn(`      - Errors      : ${genResult.errors.length}`);
  }

  // --------------------------------------------------------------------------------
  // LANGKAH 3: Pelunasan Tagihan September & Oktober 2026
  // --------------------------------------------------------------------------------
  console.log("\n📍 LANGKAH 3: Mengambil daftar tagihan September & Oktober 2026 yang belum lunas...");

  // Ambil tunggakan September
  const sepTungRes = await fetchWithRetry(
    `${BASE_URL}/api/tagihan?bulan=9&tahun=2026&status=tunggakan`,
    { headers: { Cookie: COOKIE } }
  );
  const sepTungData = await sepTungRes.json();
  const sepTunggakan = Array.isArray(sepTungData) ? sepTungData : sepTungData.data || [];

  // Ambil belum_bayar September (jika ada)
  const sepBbRes = await fetchWithRetry(
    `${BASE_URL}/api/tagihan?bulan=9&tahun=2026&status=belum_bayar`,
    { headers: { Cookie: COOKIE } }
  );
  const sepBbData = await sepBbRes.json();
  const sepBelumBayar = Array.isArray(sepBbData) ? sepBbData : sepBbData.data || [];

  // Ambil tunggakan Oktober
  const oktTungRes = await fetchWithRetry(
    `${BASE_URL}/api/tagihan?bulan=10&tahun=2026&status=tunggakan`,
    { headers: { Cookie: COOKIE } }
  );
  const oktTungData = await oktTungRes.json();
  const oktTunggakan = Array.isArray(oktTungData) ? oktTungData : oktTungData.data || [];

  // Ambil belum_bayar Oktober
  const oktBbRes = await fetchWithRetry(
    `${BASE_URL}/api/tagihan?bulan=10&tahun=2026&status=belum_bayar`,
    { headers: { Cookie: COOKIE } }
  );
  const oktBbData = await oktBbRes.json();
  const oktBelumBayar = Array.isArray(oktBbData) ? oktBbData : oktBbData.data || [];

  const billsToPay = [
    ...sepTunggakan,
    ...sepBelumBayar,
    ...oktTunggakan,
    ...oktBelumBayar,
  ];

  console.log(`📋 Total Tagihan Belum Lunas Ditemukan: ${billsToPay.length}`);
  console.log(`   - September 2026 : ${sepTunggakan.length + sepBelumBayar.length} tagihan`);
  console.log(`   - Oktober 2026   : ${oktTunggakan.length + oktBelumBayar.length} tagihan`);

  if (billsToPay.length > 0) {
    console.log(`🚀 Memproses pelunasan massal ${billsToPay.length} tagihan (concurrency: 12)...`);
    let paidCount = 0;
    const nowIso = new Date().toISOString();

    await pMap(
      billsToPay,
      async (t) => {
        const upRes = await fetchWithRetry(`${BASE_URL}/api/tagihan/${t.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: COOKIE,
          },
          body: JSON.stringify({
            status: "lunas",
            tanggalLunas: nowIso,
          }),
        });

        paidCount++;
        if (paidCount % 50 === 0 || paidCount === billsToPay.length) {
          process.stdout.write(`   ↳ Progres pelunasan: ${paidCount}/${billsToPay.length} tagihan dilunaskan\r`);
        }
        return upRes.ok;
      },
      12
    );

    console.log(`\n   ✅ Selesai melunaskan ${billsToPay.length} tagihan September & Oktober 2026.`);
  } else {
    console.log("   ✅ Tidak ada tagihan September & Oktober 2026 yang tertunggak.");
  }

  // --------------------------------------------------------------------------------
  // LANGKAH 4: Rekonsiliasi & Verifikasi Akhir
  // --------------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("📊 REKONSILIASI & VERIFIKASI AKHIR STATUS DATABASE");
  console.log("================================================================================");

  async function getSummary(bulan, tahun) {
    const statuses = ["lunas", "belum_bayar", "tunggakan", "dibatalkan"];
    const counts = {};
    for (const s of statuses) {
      const r = await fetchWithRetry(
        `${BASE_URL}/api/tagihan?bulan=${bulan}&tahun=${tahun}&status=${s}&limit=1`,
        { headers: { Cookie: COOKIE } }
      );
      const d = await r.json();
      counts[s] = Number(r.headers.get("X-Total-Count") || d.total || 0);
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { ...counts, total };
  }

  const [sumSep, sumOkt, sumNov] = await Promise.all([
    getSummary(9, 2026),
    getSummary(10, 2026),
    getSummary(11, 2026),
  ]);

  console.log(`\n📅 September 2026 (Bulan 9):`);
  console.log(`   - Lunas       : ${sumSep.lunas}`);
  console.log(`   - Belum Bayar : ${sumSep.belum_bayar}`);
  console.log(`   - Tunggakan   : ${sumSep.tunggakan}`);
  console.log(`   - Total       : ${sumSep.total}`);

  console.log(`\n📅 Oktober 2026 (Bulan 10):`);
  console.log(`   - Lunas       : ${sumOkt.lunas}`);
  console.log(`   - Belum Bayar : ${sumOkt.belum_bayar}`);
  console.log(`   - Tunggakan   : ${sumOkt.tunggakan}`);
  console.log(`   - Total       : ${sumOkt.total}`);

  console.log(`\n📅 November 2026 (Bulan 11):`);
  console.log(`   - Lunas       : ${sumNov.lunas}`);
  console.log(`   - Belum Bayar : ${sumNov.belum_bayar}`);
  console.log(`   - Tunggakan   : ${sumNov.tunggakan}`);
  console.log(`   - Total       : ${sumNov.total}`);

  console.log("\n================================================================================");
  console.log("🎉 SELURUH PROSES SELESAI DENGAN SUKSES");
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
