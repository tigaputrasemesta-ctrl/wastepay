import "dotenv/config";

const BASE_URL = process.env.BASE_URL || "https://upsheru.com";
const EMAIL = process.env.ADMIN_EMAIL || "rekoprihartono@hero.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "111111";
let COOKIE = process.env.SESSION_COOKIE || "";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runApproval({ dryRun = false } = {}) {
  await login();

  console.log(`\n🔍 Mengambil data calon pelanggan dari ${BASE_URL}...`);
  const res = await fetch(`${BASE_URL}/api/pelanggan?status=calon`, {
    headers: { Cookie: COOKIE },
  });

  if (!res.ok) {
    console.error("❌ Gagal mengambil data:", `HTTP ${res.status}`);
    return;
  }

  const calonList = await res.json();
  if (!Array.isArray(calonList) || calonList.length === 0) {
    console.log("✓ Tidak ada calon pelanggan yang menunggu approval.");
    return;
  }

  const withZona = [];
  const withoutZona = [];

  calonList.forEach((p) => {
    const hasZona = Boolean(
      p.wilayah?.zonaId ||
      p.wilayah?.zona?.id ||
      p.jadwal?.[0]?.rute?.zonaId
    );
    if (hasZona) {
      withZona.push(p);
    } else {
      withoutZona.push(p);
    }
  });

  console.log("==========================================");
  console.log(`📋 Total Calon Terdata        : ${calonList.length}`);
  console.log(`✅ Siap Di-Approve (Ada Zona) : ${withZona.length}`);
  console.log(`⏭️  Di-Skip (Tanpa Zona)       : ${withoutZona.length}`);
  console.log("==========================================\n");

  if (dryRun) {
    console.log("ℹ️ Mode DRY-RUN aktif — tidak ada perubahan yang disimpan.");
    return { total: calonList.length, ready: withZona.length, skipped: withoutZona.length };
  }

  console.log(`🚀 Memulai proses approval untuk ${withZona.length} pelanggan (jeda 1 detik/data untuk keamanan WhatsApp)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < withZona.length; i++) {
    const p = withZona[i];
    const zonaNama = p.wilayah?.zona?.nama || "Zona";
    const progress = `[${i + 1}/${withZona.length}]`;

    console.log(`${progress} Memproses "${p.nama}" (${p.kodePelanggan}) - Zona: ${zonaNama}...`);

    try {
      const updateRes = await fetch(`${BASE_URL}/api/pelanggan/${p.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: COOKIE,
        },
        body: JSON.stringify({
          status: "aktif",
          kelurahanId: p.kelurahanId,
          wilayahId: p.wilayahId,
          zonaId: p.wilayah?.zonaId || p.wilayah?.zona?.id,
        }),
      });

      if (updateRes.ok) {
        console.log(`       ✅ Sukses di-approve & diaktifkan.`);
        successCount++;
      } else {
        const err = await updateRes.json().catch(() => ({}));
        console.error(`       ❌ Gagal:`, err.error || updateRes.statusText);
        failCount++;
      }
    } catch (err) {
      console.error(`       ❌ Error jaringan:`, err.message);
      failCount++;
    }

    // Delay 1000ms antar data agar tidak kena pembatasan rate limit provider WhatsApp
    await sleep(1000);
  }

  console.log("\n==========================================");
  console.log("🎉 PROSES APPROVAL SELESAI");
  console.log(`- Berhasil Di-Approve : ${successCount}`);
  console.log(`- Gagal               : ${failCount}`);
  console.log(`- Di-Skip (Tanpa Zona): ${withoutZona.length}`);
  console.log("==========================================");

  return { successCount, failCount, skipped: withoutZona.length };
}

// Cek argumen CLI: jika dipanggil langsung dengan --execute maka jalankan eksekusi, default dry-run jika dipanggil modul
const isExecute = process.argv.includes("--execute");
runApproval({ dryRun: !isExecute }).catch(console.error);
