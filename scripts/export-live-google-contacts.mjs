import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL || "https://upsheru.com";
const EMAIL = process.env.ADMIN_EMAIL || "rekoprihartono@hero.com";
const PASSWORD = process.env.ADMIN_PASSWORD || "111111";
const KNOWN_SESSION_TOKEN =
  process.env.SESSION_TOKEN ||
  "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6NTAsImVtYWlsIjoicmVrb3ByaWhhcnRvbm9AaGVyby5jb20iLCJuYW1hIjoiUm9obWF0IEVrbyBQIiwicm9sZSI6InN1cGVyYWRtaW4iLCJ2IjoyLCJpYXQiOjE3OTQ0OTA3ODMsImV4cCI6MTc5NTA5NTU4M30.XkJNoxh7q24RKxG6CWeIPKXGm81MnW89h66_0m684e4";

// Helper E.164 phone normalization
function formatPhoneE164(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^\d+]/g, "").trim();
  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("62")) return "+" + clean;
  if (clean.startsWith("0")) return "+62" + clean.slice(1);
  return "+62" + clean;
}

// Helper Title Case
function toTitleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      const w = word.toLowerCase();
      if (w === "ykp") return "YKP";
      if (w === "bmk") return "BMK";
      if (w === "thr") return "THR";
      if (w === "smp" || w === "smp6") return w === "smp6" ? "SMP 6" : "SMP";
      if (w === "rt") return "RT";
      if (w === "rw") return "RW";
      if (w === "atk") return "ATK";
      if (w === "dmiles" || w === "d'miles") return "Dmiles";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

// Deteksi nama blok berdasarkan alamat jika wilayah kosong
function detectBlokFromText(text) {
  const s = (text || "").toLowerCase();
  if (s.includes("tabroni")) return "Blok Tabroni";
  if (s.includes("smp6") || s.includes("smp 6") || s.includes("smp.6") || s.includes("dmiles") || s.includes("mandor samin") || s.includes("saleh") || s.includes("shaleh")) return "Blok Bawah Dmiles + SMP 6";
  if (s.includes("sasak")) return "Blok Sasak";
  if (s.includes("ykp")) return "Blok YKP Kelapa";
  if (s.includes("meran") || s.includes("bakung")) return "Blok Bakung";
  if (s.includes("setu") || s.includes("pete")) return "Blok Setu + Rafael Pete";
  if (s.includes("niman") || s.includes("gg.niman")) return "Blok Gg Niman";
  if (s.includes("kp.bulak") || s.includes("kp bulak") || s.includes("kampung bulak")) return "Blok Kp Bulak";
  if (s.includes("kp.sawah") || s.includes("kp sawah") || s.includes("kampung sawah")) return "Blok Kampung Sawah";
  if (s.includes("cilodong") || s.includes("abdul ghani") || s.includes("abdul gani")) return "Blok Jalan Raya Cilodong";
  if (s.includes("gang umar") || s.includes("gg umar") || s.includes("gg.umar") || s.includes("c8 umar") || s.includes("b2 gang umar")) return "Blok Gg Umar";
  if (s.includes("santri") || s.includes("santry")) return "Blok Perum Santri";
  if (s.includes("sarin") || s.includes("gg.sarin")) return "Blok Gg Sarin";
  if (s.includes("agisna")) return "Blok Agisna";
  if (s.includes("bmk")) return "Blok Perum BMK";
  if (s.includes("thr")) return "Blok THR";
  if (s.includes("kibeng")) return "Blok Kibeng";
  if (s.includes("talang baduri")) return "Blok Talang Baduri";
  if (s.includes("saphire") || s.includes("sapire") || s.includes("trevista")) return "Blok Trevista / Dmiles";
  if (s.includes("desari")) return "Blok Desari Bawah";
  if (s.includes("berdikari")) return "Blok Perum Berdikari";
  if (s.includes("kebun duren") || s.includes("kebon duren")) return "Blok Jl Raya Kebon Duren";
  if (s.includes("mts")) return "Blok MTS";
  if (s.includes("menteng")) return "Blok Gg Menteng";
  if (s.includes("pecel")) return "Blok Gg Pecel";
  if (s.includes("puah")) return "Blok H Puah";
  return "";
}

function cleanBlokZona(wilayahNama, zonaNama, alamat, kelurahanNama) {
  let raw = "";

  if (wilayahNama && /blok/i.test(wilayahNama)) {
    raw = wilayahNama;
  } else if (zonaNama && /blok/i.test(zonaNama)) {
    raw = zonaNama;
  } else if (wilayahNama && !/rt|rw/i.test(wilayahNama)) {
    raw = wilayahNama;
  } else if (zonaNama) {
    raw = zonaNama;
  } else {
    // Coba deteksi dari alamat
    const detected = detectBlokFromText(alamat);
    if (detected) return detected;
    raw = wilayahNama || (kelurahanNama ? `Blok ${kelurahanNama}` : "Blok Depok");
  }

  raw = raw.replace(/\s+/g, " ").trim();
  let formatted = toTitleCase(raw);
  if (!/^blok/i.test(formatted)) {
    formatted = `Blok ${formatted}`;
  }
  return formatted.replace(/\s*\+\s*/g, " + ").trim();
}

function formatContactName(nama, blokZona) {
  const cleanNama = (nama || "").trim();
  const cleanBlok = (blokZona || "").trim();

  if (cleanBlok && cleanNama.toLowerCase().includes(cleanBlok.toLowerCase())) {
    return cleanNama;
  }
  if (cleanBlok) {
    return `${cleanNama} ${cleanBlok}`;
  }
  return cleanNama;
}

function escapeCsv(val, isPhone = false) {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (!isPhone && /^[=@]/.test(s)) s = "'" + s;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`🚀 EKSPOR DATA PELANGGAN TERBARU DARI DATABASE LIVE: ${BASE_URL}`);
  console.log("══════════════════════════════════════════════════════════════\n");

  let cookie = "";

  if (KNOWN_SESSION_TOKEN) {
    // Cek apakah token yang kita punya masih aktif
    console.log("🔑 Memeriksa token sesi tersimpan...");
    try {
      const testRes = await fetch(`${BASE_URL}/api/pelanggan?page=1&limit=1`, {
        headers: { Cookie: `session=${KNOWN_SESSION_TOKEN}` },
      });
      if (testRes.ok) {
        cookie = `session=${KNOWN_SESSION_TOKEN}`;
        console.log("✅ Token sesi aktif dan valid!");
      } else {
        console.log(`⚠️ Token sesi tidak valid (HTTP ${testRes.status}), mencoba login baru...`);
      }
    } catch (e) {
      console.log("⚠️ Gagal verifikasi token tersimpan, mencoba login baru...");
    }
  }

  if (!cookie) {
    console.log(`🔐 Login ke ${BASE_URL} sebagai ${EMAIL}...`);
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login gagal: HTTP ${loginRes.status}`);
    }

    cookie = loginRes.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("Gagal mengambil session cookie");
    console.log("✅ Berhasil login ke live server.");
  }

  console.log("\n📥 Mengambil seluruh data pelanggan dari live database...");
  let allCustomers = [];

  const initialRes = await fetch(`${BASE_URL}/api/pelanggan`, { headers: { Cookie: cookie } });
  if (!initialRes.ok) throw new Error(`Fetch live pelanggan gagal: HTTP ${initialRes.status}`);
  const initialData = await initialRes.json();

  if (Array.isArray(initialData)) {
    allCustomers = initialData;
    console.log(`   ↳ Diunduh langsung (single batch): ${allCustomers.length} pelanggan.`);
  } else if (initialData.data && Array.isArray(initialData.data)) {
    allCustomers.push(...initialData.data);
    let page = 2;
    const limit = 200;
    while (page <= (initialData.totalPages || 1)) {
      const url = `${BASE_URL}/api/pelanggan?page=${page}&limit=${limit}`;
      const res = await fetch(url, { headers: { Cookie: cookie } });
      if (!res.ok) throw new Error(`Fetch page ${page} gagal: HTTP ${res.status}`);
      const data = await res.json();
      allCustomers.push(...(data.data || []));
      page++;
    }
  }

  // Deduplikasi by ID untuk keamanan mutlak
  const seenIds = new Set();
  allCustomers = allCustomers.filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  console.log(`\n🎉 Berhasil memproses ${allCustomers.length} data pelanggan live terupdate!\n`);

  // 1. GENERATE GOOGLE CONTACTS CSV
  const headers = [
    "Name",
    "Given Name",
    "Additional Name",
    "Family Name",
    "Yomi Name",
    "Given Name Yomi",
    "Additional Name Yomi",
    "Family Name Yomi",
    "Name Prefix",
    "Name Suffix",
    "Initials",
    "Nickname",
    "Short Name",
    "Maiden Name",
    "Birthday",
    "Gender",
    "Location",
    "Billing Information",
    "Directory Server",
    "Mileage",
    "Occupation",
    "Hobby",
    "Sensitivity",
    "Priority",
    "Subject",
    "Notes",
    "Language",
    "Photo",
    "Group Membership",
    "E-mail 1 - Type",
    "E-mail 1 - Value",
    "Phone 1 - Type",
    "Phone 1 - Value",
    "Address 1 - Type",
    "Address 1 - Formatted",
    "Address 1 - Street",
    "Address 1 - City",
    "Address 1 - PO Box",
    "Address 1 - Region",
    "Address 1 - Postal Code",
    "Address 1 - Country",
    "Address 1 - Extended Address",
    "Organization 1 - Name",
    "Organization 1 - Title",
    "Organization 1 - Department",
  ];

  const csvRows = [headers.join(",")];
  const vcards = [];

  for (const p of allCustomers) {
    const kelurahan = p.kelurahan?.nama || "";
    const blok = cleanBlokZona(p.wilayah?.nama, p.wilayah?.zona?.nama, p.alamat, kelurahan);
    const fullName = formatContactName(p.nama, blok);
    const phone = formatPhoneE164(p.noTelepon);
    const kategori = p.kategori ? p.kategori.replace(/_/g, " ").toUpperCase() : "";

    const notesLines = [
      `Kode Pelanggan: ${p.kodePelanggan}`,
      `Status: ${(p.status || "aktif").toUpperCase()}`,
      `Kategori: ${kategori}`,
      kelurahan ? `Kelurahan: ${kelurahan}` : null,
      blok ? `Zona: ${blok}` : null,
      p.rtRw ? `RT/RW: ${p.rtRw}` : null,
      p.patokanLokasi ? `Patokan: ${p.patokanLokasi}` : null,
      p.penanggungjawab && p.penanggungjawab !== p.nama ? `Penanggung Jawab: ${p.penanggungjawab}` : null,
      p.latitude && p.longitude ? `Koordinat: ${p.latitude}, ${p.longitude}` : null,
    ].filter(Boolean);

    const fullAddress = [
      p.alamat,
      p.rtRw ? `RT/RW ${p.rtRw}` : null,
      kelurahan ? `Kel. ${kelurahan}` : null,
    ].filter(Boolean).join(", ");

    // CSV Row
    const row = [
      escapeCsv(fullName), // Name: e.g. "Eko Blok YKP Kelapa"
      escapeCsv(fullName), // Given Name: full display name so WhatsApp & HP display completely
      "", // Additional Name
      "", // Family Name
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      escapeCsv(notesLines.join("\n")), // Notes
      "", "",
      escapeCsv("* myContacts ::: Pelanggan WastePay"), // Group Membership
      "", "", // Email
      "Mobile", // Phone 1 - Type
      escapeCsv(phone, true), // Phone 1 - Value (clean E.164)
      "Home", // Address 1 - Type
      escapeCsv(fullAddress), // Address 1 - Formatted
      escapeCsv(p.alamat || ""), // Address 1 - Street
      escapeCsv(kelurahan || "Depok"), // Address 1 - City
      "", // PO Box
      "Jawa Barat", // Region
      "", // Postal Code
      "Indonesia", // Country
      escapeCsv(p.patokanLokasi || (p.rtRw ? `RT/RW ${p.rtRw}` : "")), // Extended Address
      "WastePay", // Organization 1 - Name
      escapeCsv(blok ? `Pelanggan - ${blok}` : `Pelanggan ${kategori}`), // Organization 1 - Title
      escapeCsv(blok), // Organization 1 - Department
    ];
    csvRows.push(row.join(","));

    // vCard
    const card = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${fullName}`,
      `N:;${fullName.replace(/;/g, " ")};;;`,
      phone ? `TEL;TYPE=CELL,VOICE:${phone}` : "",
      p.alamat
        ? `ADR;TYPE=HOME:;;${p.alamat.replace(/;/g, " ")};${kelurahan || "Depok"};Jawa Barat;;Indonesia`
        : "",
      "ORG:WastePay",
      `TITLE:${blok ? `Pelanggan - ${blok}` : `Pelanggan ${kategori}`}`,
      `NOTE:${notesLines.join("\\n")}`,
      "CATEGORIES:Pelanggan WastePay",
      "END:VCARD",
    ].filter(Boolean).join("\r\n");
    vcards.push(card);
  }

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const vcfContent = vcards.join("\r\n\r\n");

  // Output paths
  const targets = [
    { csv: "google_contacts_pelanggan_terbaru.csv", vcf: "google_contacts_pelanggan_terbaru.vcf" },
    { csv: "data/google_contacts_wastepay_nama_zona.csv", vcf: "data/google_contacts_wastepay_nama_zona.vcf" },
    { csv: "public/downloads/google_contacts_pelanggan_terbaru.csv", vcf: "public/downloads/google_contacts_pelanggan_terbaru.vcf" },
  ];

  for (const t of targets) {
    fs.mkdirSync(path.dirname(path.resolve(t.csv)), { recursive: true });
    fs.writeFileSync(t.csv, csvContent, "utf8");
    fs.writeFileSync(t.vcf, vcfContent, "utf8");
  }

  console.log("══════════════════════════════════════════════════════════════");
  console.log(`✅ BERHASIL MENGEKSPOR ${allCustomers.length} KONTAK PELANGGAN LIVE TERUPDATE!`);
  console.log("══════════════════════════════════════════════════════════════");
  console.log("\n📁 Lokasi File Tersimpan:");
  console.log(`  1. ${path.resolve("google_contacts_pelanggan_terbaru.csv")}`);
  console.log(`  2. ${path.resolve("google_contacts_pelanggan_terbaru.vcf")}`);
  console.log(`  3. ${path.resolve("data/google_contacts_wastepay_nama_zona.csv")}`);
  console.log(`  4. ${path.resolve("public/downloads/google_contacts_pelanggan_terbaru.csv")}`);

  console.log("\n📋 Sampel 10 Kontak Terbaru:");
  for (let i = 0; i < Math.min(10, allCustomers.length); i++) {
    const c = allCustomers[i];
    const b = cleanBlokZona(c.wilayah?.nama, c.wilayah?.zona?.nama, c.alamat, c.kelurahan?.nama);
    const fn = formatContactName(c.nama, b);
    console.log(`  [${i + 1}] ${fn} -> ${formatPhoneE164(c.noTelepon)} (${b})`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
