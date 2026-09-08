// Uji live production: login + panggil API utama (admin & petugas) + cek halaman.
// Jalankan:
//   node scripts/test-live.mjs
// Target bisa di-override:  BASE_URL=https://... node scripts/test-live.mjs
const BASE = process.env.BASE_URL || "https://tpsheru.vercel.app";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  → " + detail : ""}`);
}

async function req(method, path, { cookie, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

async function login(email, password) {
  const r = await req("POST", "/api/auth/login", { body: { email, password } });
  const cookie = r.setCookie ? r.setCookie.split(";")[0] : "";
  return { ...r, cookie };
}

async function main() {
  console.log("TARGET:", BASE, "\n");

  // ---------- Login ----------
  const admin = await login("demo-admin@wastepay.local", "demo123");
  check("login admin", admin.status === 200 && admin.cookie.startsWith("__Host-session"), `status ${admin.status}`);

  const petugas = await login("demo-petugas@wastepay.local", "demo123");
  check("login petugas", petugas.status === 200 && petugas.cookie.startsWith("__Host-session"), `status ${petugas.status}`);
  if (admin.status !== 200 || petugas.status !== 200) {
    console.log("\nLogin gagal — hentikan uji.");
    console.log("admin resp:", JSON.stringify(admin.data));
    console.log("petugas resp:", JSON.stringify(petugas.data));
    process.exitCode = 1;
    return;
  }

  // ---------- Petugas ----------
  const me = await req("GET", "/api/auth/me", { cookie: petugas.cookie });
  check("petugas /api/auth/me", me.status === 200 && me.data.role === "petugas", `role=${me.data?.role}`);

  const kendaraanP = await req("GET", "/api/kendaraan", { cookie: petugas.cookie });
  const owned = (kendaraanP.data || []).filter((k) => k.aktif !== false);
  check("petugas /api/kendaraan", kendaraanP.status === 200 && owned.length >= 1, `${owned.length} kendaraan aktif`);
  const truckId = owned[0]?.id ?? null;

  const chatP = await req("GET", "/api/chat", { cookie: petugas.cookie });
  const nPesan = chatP.data?.pesan?.length ?? 0;
  check("petugas GET /api/chat", chatP.status === 200 && nPesan >= 4, `${nPesan} pesan`);

  const chatPost = await req("POST", "/api/chat", { cookie: petugas.cookie, body: { isi: "[TEST] cek otomatis " + Date.now() } });
  check("petugas POST /api/chat", (chatPost.status === 200 || chatPost.status === 201) && chatPost.data?.id, `id=${chatPost.data?.id}`);

  const lookup = await req("GET", "/api/pengangkutan/lapor?kode=TES-001", { cookie: petugas.cookie });
  check("lapor lookup TES-001 (wilayah sendiri)", lookup.status === 200 && lookup.data?.pelanggan && lookup.data?.laporan?.length >= 1, `nama=${lookup.data?.pelanggan?.nama} | laporan=${lookup.data?.laporan?.length}`);

  const lookupLuar = await req("GET", "/api/pengangkutan/lapor?kode=TES-005", { cookie: petugas.cookie });
  check("lapor lookup TES-005 (luar wilayah → 404)", lookupLuar.status === 404, `status ${lookupLuar.status}`);

  const lapor = await req("POST", "/api/pengangkutan/lapor", {
    cookie: petugas.cookie,
    body: { kodePelanggan: "TES-009", status: "diambil", catatan: "[TEST] cek otomatis", kendaraanId: truckId },
  });
  check("lapor POST TES-009=diambil", (lapor.status === 200 || lapor.status === 201) && lapor.data?.id, `status=${lapor.status} dibuat=${lapor.data?.dibuat}`);

  const read = await req("POST", "/api/chat/read", { cookie: petugas.cookie, body: {} });
  check("petugas POST /api/chat/read", read.status === 200, `resp=${JSON.stringify(read.data).slice(0, 40)}`);

  // ---------- Admin ----------
  const pelanggan = await req("GET", "/api/pelanggan", { cookie: admin.cookie });
  const nPel = Array.isArray(pelanggan.data) ? pelanggan.data.length : 0;
  const adaTes = Array.isArray(pelanggan.data) && pelanggan.data.some((p) => p.kodePelanggan === "TES-001");
  check("admin GET /api/pelanggan", pelanggan.status === 200 && adaTes, `${nPel} pelanggan`);

  const threads = await req("GET", "/api/chat", { cookie: admin.cookie });
  const threadDemo = Array.isArray(threads.data) ? threads.data.find((t) => t.nama?.includes("Demo Petugas")) : null;
  check("admin GET /api/chat (daftar thread)", threads.status === 200 && threadDemo, `thread=${threadDemo?.nama} | unread=${threadDemo?.unread}`);

  const angkut = await req("GET", "/api/pengangkutan", { cookie: admin.cookie });
  check("admin GET /api/pengangkutan", angkut.status === 200 && Array.isArray(angkut.data) && angkut.data.length >= 7, `${angkut.data?.length} record`);

  const kendaraanA = await req("GET", "/api/kendaraan", { cookie: admin.cookie });
  const adaTruck = Array.isArray(kendaraanA.data) && kendaraanA.data.some((k) => k.nama?.includes("Dump Truck"));
  check("admin GET /api/kendaraan", kendaraanA.status === 200 && adaTruck, `${kendaraanA.data?.length} kendaraan`);

  const lokasi = await req("GET", "/api/petugas/lokasi", { cookie: admin.cookie });
  check("admin GET /api/petugas/lokasi", lokasi.status === 200 && Array.isArray(lokasi.data), `${lokasi.data?.length} titik`);

  // ---------- Halaman (status 200) ----------
  const pages = ["/", "/peta", "/chat", "/dashboard", "/pelanggan", "/m", "/m/angkut", "/m/lapor", "/m/chat", "/m/survei"];
  for (const p of pages) {
    const r = await fetch(BASE + p, { redirect: "manual" });
    check(`halaman ${p}`, r.status === 200 || r.status === 307 || r.status === 308, `HTTP ${r.status}`);
  }

  // ---------- Rangkuman ----------
  const fail = results.filter((r) => !r.ok);
  console.log(`\n========================================`);
  console.log(`HASIL: ${results.length - fail.length}/${results.length} lulus`);
  if (fail.length) {
    console.log("GAGAL:");
    fail.forEach((f) => console.log("  - " + f.name + (f.detail ? " (" + f.detail + ")" : "")));
  }
  console.log(`========================================`);
  if (fail.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERROR:", e?.message ?? e);
  process.exitCode = 1;
});
