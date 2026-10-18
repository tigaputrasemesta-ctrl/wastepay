#!/usr/bin/env node
/**
 * CLI Script: Sinkronisasi Data Pelanggan WastePay ke Google Contacts via Google People API.
 * 
 * Penggunaan:
 *   node scripts/sync-google-contacts.mjs --help
 *   node scripts/sync-google-contacts.mjs --auth
 *   node scripts/sync-google-contacts.mjs --code 4/0A...
 *   node scripts/sync-google-contacts.mjs --sync
 *   node scripts/sync-google-contacts.mjs --dry-run
 *   node scripts/sync-google-contacts.mjs --export-csv [namafile.csv]
 *   node scripts/sync-google-contacts.mjs --export-vcf [namafile.vcf]
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { Pool } from "pg";

// ============================================================================
// HELPER MURNI GOOGLE CONTACTS
// ============================================================================

export function formatPhoneE164(phone) {
  if (!phone) return "";
  let clean = String(phone).replace(/[^\d+]/g, "").trim();
  if (clean.startsWith("+")) return clean;
  if (clean.startsWith("62")) return "+" + clean;
  if (clean.startsWith("0")) return "+62" + clean.slice(1);
  return "+62" + clean;
}

export function getGoogleAuthUrl(config, state) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: [
      "https://www.googleapis.com/auth/contacts",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  if (state) params.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(code, config) {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal menukar kode Google OAuth: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  if (!refreshToken) {
    throw new Error("Refresh token tidak diterima dari Google. Pastikan consent screen menyertakan prompt=consent dan access_type=offline.");
  }

  const email = await getUserEmail(accessToken);
  return { accessToken, refreshToken, email };
}

export async function refreshGoogleAccessToken(refreshToken, config) {
  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal merefresh token Google: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function getUserEmail(accessToken) {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const info = await res.json();
      return info.email || null;
    }
  } catch (err) {
    console.error("Gagal mengambil info user Google:", err);
  }
  return null;
}

export async function getOrCreateGoogleContactGroup(accessToken, groupName = "Pelanggan WastePay") {
  try {
    const listRes = await fetch("https://people.googleapis.com/v1/contactGroups?pageSize=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (listRes.ok) {
      const data = await listRes.json();
      const groups = data.contactGroups || [];
      const found = groups.find((g) => g.name === groupName || g.formattedName === groupName);
      if (found?.resourceName) return found.resourceName;
    }

    const createRes = await fetch("https://people.googleapis.com/v1/contactGroups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactGroup: { name: groupName },
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.resourceName || null;
    }
  } catch (err) {
    console.error("Gagal membuat/mencari contact group:", err);
  }
  return null;
}

export function formatPelangganToGoogleContact(pelanggan, groupResourceName) {
  const phone = formatPhoneE164(pelanggan.noTelepon);
  const kelurahan = pelanggan.kelurahan?.nama || "";
  const zona = pelanggan.wilayah?.zona?.nama || pelanggan.wilayah?.nama || "";
  const paketNama = pelanggan.paket?.nama || "";
  const kategori = pelanggan.kategori ? pelanggan.kategori.replace(/_/g, " ").toUpperCase() : "";

  const nameParts = (pelanggan.nama || "").trim().split(/\s+/);
  const givenName = nameParts[0] || "Pelanggan";
  const familyName = nameParts.slice(1).join(" ") || "";
  const displayName = `${pelanggan.nama} [${pelanggan.kodePelanggan}]`;

  const addressParts = [
    pelanggan.alamat,
    pelanggan.rtRw ? `RT/RW ${pelanggan.rtRw}` : null,
    kelurahan ? `Kel. ${kelurahan}` : null,
    zona ? `Zona ${zona}` : null,
  ].filter(Boolean);
  const formattedAddress = addressParts.join(", ");

  const bioLines = [
    `Kode Pelanggan: ${pelanggan.kodePelanggan}`,
    `Status: ${(pelanggan.status || "aktif").toUpperCase()}`,
    `Kategori: ${kategori}${paketNama ? ` (${paketNama})` : ""}`,
    kelurahan ? `Kelurahan: ${kelurahan}` : null,
    zona ? `Zona Area: ${zona}` : null,
    pelanggan.rtRw ? `RT/RW: ${pelanggan.rtRw}` : null,
    pelanggan.patokanLokasi ? `Patokan: ${pelanggan.patokanLokasi}` : null,
    pelanggan.penanggungjawab && pelanggan.penanggungjawab !== pelanggan.nama
      ? `Penanggung Jawab: ${pelanggan.penanggungjawab}`
      : null,
    pelanggan.latitude && pelanggan.longitude
      ? `Koordinat: ${pelanggan.latitude}, ${pelanggan.longitude}`
      : null,
  ].filter(Boolean);

  const contact = {
    names: [
      {
        givenName,
        familyName,
        displayName,
      },
    ],
    phoneNumbers: phone
      ? [
          {
            value: phone,
            type: "mobile",
          },
        ]
      : [],
    addresses: pelanggan.alamat
      ? [
          {
            formattedValue: formattedAddress,
            streetAddress: pelanggan.alamat,
            city: kelurahan || "Depok",
            region: "Jawa Barat",
            country: "Indonesia",
            type: "home",
          },
        ]
      : [],
    organizations: [
      {
        name: "WastePay",
        title: `Pelanggan - ${kategori || "Umum"}`,
        department: zona || undefined,
      },
    ],
    biographies: [
      {
        value: bioLines.join("\n"),
        contentType: "TEXT_PLAIN",
      },
    ],
    userDefined: [
      { key: "WastePayKode", value: pelanggan.kodePelanggan },
      { key: "WastePayStatus", value: pelanggan.status || "aktif" },
    ],
  };

  if (groupResourceName) {
    contact.memberships = [
      {
        contactGroupMembership: {
          contactGroupResourceName: groupResourceName,
        },
      },
    ];
  }

  return contact;
}

export async function fetchExistingGoogleContacts(accessToken) {
  const map = new Map();
  let pageToken = undefined;

  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", "names,phoneNumbers,userDefined,metadata");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn("Gagal membaca connections Google:", res.status);
      break;
    }

    const data = await res.json();
    const connections = data.connections || [];

    for (const conn of connections) {
      const resourceName = conn.resourceName;
      const etag = conn.etag;
      const displayName = conn.names?.[0]?.displayName || "";

      const userDefs = conn.userDefined || [];
      const kodeDef = userDefs.find((u) => u.key === "WastePayKode");
      if (kodeDef?.value) {
        map.set(`kode:${kodeDef.value.trim().toUpperCase()}`, { resourceName, etag, displayName });
      }

      const codeMatch = displayName.match(/\[([A-Za-z0-9\-_]+)\]/);
      if (codeMatch && codeMatch[1]) {
        map.set(`kode:${codeMatch[1].trim().toUpperCase()}`, { resourceName, etag, displayName });
      }

      const phones = conn.phoneNumbers || [];
      for (const p of phones) {
        const clean = formatPhoneE164(p.value);
        if (clean) {
          map.set(`phone:${clean}`, { resourceName, etag, displayName });
        }
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return map;
}

export async function syncPelangganToGooglePeopleApi(params) {
  const { customers, accessToken, groupName = "Pelanggan WastePay", updateExisting = false } = params;

  const result = {
    total: customers.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const groupResourceName = await getOrCreateGoogleContactGroup(accessToken, groupName);
  result.groupResourceName = groupResourceName;

  const existingMap = await fetchExistingGoogleContacts(accessToken);

  const toCreate = [];
  const toUpdate = [];

  for (const c of customers) {
    const kodeKey = `kode:${c.kodePelanggan.trim().toUpperCase()}`;
    const phoneKey = c.noTelepon ? `phone:${formatPhoneE164(c.noTelepon)}` : null;

    const existing = existingMap.get(kodeKey) || (phoneKey ? existingMap.get(phoneKey) : null);
    const contactPerson = formatPelangganToGoogleContact(c, groupResourceName);

    if (existing) {
      if (updateExisting) {
        toUpdate.push({
          contact: contactPerson,
          existingResourceName: existing.resourceName,
          etag: existing.etag,
        });
      } else {
        result.skipped++;
      }
    } else {
      toCreate.push(contactPerson);
    }
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch("https://people.googleapis.com/v1/people:batchCreateContacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: batch.map((contactPerson) => ({ contactPerson })),
          readMask: "names,phoneNumbers,userDefined,metadata",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        result.failed += batch.length;
        result.errors.push(`Batch create gagal (${i + 1}-${i + batch.length}): ${res.status} ${errText}`);
      } else {
        const resData = await res.json();
        const createdCount = resData.createdPeople?.length || batch.length;
        result.created += createdCount;
      }
    } catch (err) {
      result.failed += batch.length;
      result.errors.push(`Koneksi batch create gagal: ${err?.message || err}`);
    }
  }

  for (const item of toUpdate) {
    try {
      const url = `https://people.googleapis.com/v1/${item.existingResourceName}:updateContact?updatePersonFields=names,phoneNumbers,addresses,organizations,biographies,userDefined,memberships`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...item.contact,
          etag: item.etag,
        }),
      });

      if (res.ok) {
        result.updated++;
      } else {
        const errText = await res.text();
        result.failed++;
        result.errors.push(`Update ${item.existingResourceName} gagal: ${res.status} ${errText}`);
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`Error update: ${err?.message || err}`);
    }
  }

  return result;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function generateGoogleContactsCsv(pelangganList, groupLabel = "Pelanggan WastePay") {
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

  const rows = [headers.join(",")];

  for (const p of pelangganList) {
    const nameParts = (p.nama || "").trim().split(/\s+/);
    const givenName = nameParts[0] || "Pelanggan";
    const familyName = nameParts.slice(1).join(" ") || "";
    const fullName = `${p.nama} [${p.kodePelanggan}]`;
    const phone = formatPhoneE164(p.noTelepon);
    const kelurahan = p.kelurahan?.nama || "";
    const zona = p.wilayah?.zona?.nama || p.wilayah?.nama || "";
    const kategori = p.kategori ? p.kategori.replace(/_/g, " ").toUpperCase() : "";

    const notesLines = [
      `Kode Pelanggan: ${p.kodePelanggan}`,
      `Status: ${(p.status || "aktif").toUpperCase()}`,
      `Kategori: ${kategori}`,
      kelurahan ? `Kelurahan: ${kelurahan}` : null,
      zona ? `Zona: ${zona}` : null,
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

    const row = [
      escapeCsv(fullName),
      escapeCsv(givenName),
      "",
      escapeCsv(familyName),
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      escapeCsv(notesLines.join("\n")),
      "", "",
      escapeCsv(`* myContacts ::: ${groupLabel}`),
      "", "",
      "Mobile",
      escapeCsv(phone),
      "Home",
      escapeCsv(fullAddress),
      escapeCsv(p.alamat || ""),
      escapeCsv(kelurahan || "Depok"),
      "",
      "Jawa Barat",
      "",
      "Indonesia",
      escapeCsv(p.patokanLokasi || (p.rtRw ? `RT/RW ${p.rtRw}` : "")),
      "WastePay",
      escapeCsv(`Pelanggan ${kategori}`),
      escapeCsv(zona),
    ];

    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}

export function generateVCard(pelangganList, categoryLabel = "Pelanggan WastePay") {
  const vcards = [];

  for (const p of pelangganList) {
    const nameParts = (p.nama || "").trim().split(/\s+/);
    const givenName = nameParts[0] || "Pelanggan";
    const familyName = nameParts.slice(1).join(" ") || "";
    const fullName = `${p.nama} [${p.kodePelanggan}]`;
    const phone = formatPhoneE164(p.noTelepon);
    const kelurahan = p.kelurahan?.nama || "";
    const zona = p.wilayah?.zona?.nama || p.wilayah?.nama || "";
    const kategori = p.kategori ? p.kategori.replace(/_/g, " ").toUpperCase() : "";

    const notesLines = [
      `Kode: ${p.kodePelanggan}`,
      `Status: ${(p.status || "aktif").toUpperCase()}`,
      `Kategori: ${kategori}`,
      kelurahan ? `Kelurahan: ${kelurahan}` : null,
      zona ? `Zona: ${zona}` : null,
      p.rtRw ? `RT/RW: ${p.rtRw}` : null,
      p.patokanLokasi ? `Patokan: ${p.patokanLokasi}` : null,
      p.penanggungjawab && p.penanggungjawab !== p.nama ? `PJ: ${p.penanggungjawab}` : null,
      p.latitude && p.longitude ? `GPS: ${p.latitude}, ${p.longitude}` : null,
    ].filter(Boolean);

    const card = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${fullName}`,
      `N:${familyName};${givenName};;;`,
      phone ? `TEL;TYPE=CELL,VOICE:${phone}` : "",
      p.alamat
        ? `ADR;TYPE=HOME:;;${p.alamat.replace(/;/g, " ")};${kelurahan || "Depok"};Jawa Barat;;Indonesia`
        : "",
      "ORG:WastePay",
      `TITLE:Pelanggan ${kategori}`,
      `NOTE:${notesLines.join("\\n")}`,
      `CATEGORIES:${categoryLabel}`,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");

    vcards.push(card);
  }

  return vcards.join("\r\n\r\n");
}

// ============================================================================
// DATABASE & CLI RUNNER
// ============================================================================

function getPrisma() {
  const dbUrl = process.env.DATABASE_URL?.trim() || "file:./dev.db";
  let adapter;
  if (dbUrl.startsWith("postgres")) {
    const pool = new Pool({
      connectionString: dbUrl.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, ""),
      ssl:
        process.env.NODE_ENV === "production" || dbUrl.includes("supabase.com")
          ? { rejectUnauthorized: false }
          : undefined,
    });
    adapter = new PrismaPg(pool);
  } else {
    adapter = new PrismaLibSql({ url: dbUrl });
  }
  return new PrismaClient({ adapter });
}

const C = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function logHeader(title) {
  console.log(`\n${C.cyan}${C.bright}══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}  ${title}${C.reset}`);
  console.log(`${C.cyan}${C.bright}══════════════════════════════════════════════════════════${C.reset}\n`);
}

function showHelp() {
  logHeader("WastePay ↔ Google Contacts Synchronization CLI");
  console.log(`Perintah yang tersedia:

  ${C.green}node scripts/sync-google-contacts.mjs --auth${C.reset}
      Membuat URL otorisasi OAuth2 untuk akun Google / Gmail Anda.
      Buka URL tersebut di browser, pilih email yang dituju, dan izinkan akses kontak.

  ${C.green}node scripts/sync-google-contacts.mjs --code <AUTH_CODE>${C.reset}
      Menukar kode otorisasi dari Google dengan Refresh Token & Access Token,
      lalu menyimpannya otomatis ke .env dan database Pengaturan.

  ${C.green}node scripts/sync-google-contacts.mjs --sync${C.reset}
      Menjalankan sinkronisasi data pelanggan dari database WastePay ke Google Contacts
      pada akun email yang sudah diotorisasi via Google People API.
      (Opsi tambahan: tambahkan --update untuk memperbarui kontak yang sudah ada).

  ${C.green}node scripts/sync-google-contacts.mjs --dry-run${C.reset}
      Mengecek & menampilkan pratinjau data pelanggan yang akan disinkronkan
      tanpa mengirim perubahan apa pun ke Google Contacts.

  ${C.green}node scripts/sync-google-contacts.mjs --export-csv [filename.csv]${C.reset}
      Mengekspor seluruh pelanggan ke file CSV standar Google Contacts
      (siap diimpor manual via contacts.google.com).

  ${C.green}node scripts/sync-google-contacts.mjs --export-vcf [filename.vcf]${C.reset}
      Mengekspor seluruh pelanggan ke file vCard 3.0 (.vcf)
      (bisa diimpor ke Google Contacts, Android, iOS, atau aplikasi kontak lainnya).

  ${C.green}node scripts/sync-google-contacts.mjs --status${C.reset}
      Mengecek status konfigurasi Google OAuth, email tersambung, dan total pelanggan.
`);
}

async function getOAuthConfig(prisma) {
  let clientId = process.env.GOOGLE_CLIENT_ID || "";
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  let redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrasi/google-contacts/callback";
  let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  let syncEmail = process.env.GOOGLE_SYNC_EMAIL;

  if (prisma) {
    try {
      const dbClientId = await prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_ID" } });
      const dbClientSecret = await prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_SECRET" } });
      const dbRedirectUri = await prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REDIRECT_URI" } });
      const dbRefreshToken = await prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REFRESH_TOKEN" } });
      const dbSyncEmail = await prisma.pengaturan.findUnique({ where: { key: "GOOGLE_SYNC_EMAIL" } });

      if (dbClientId?.value) clientId = dbClientId.value;
      if (dbClientSecret?.value) clientSecret = dbClientSecret.value;
      if (dbRedirectUri?.value) redirectUri = dbRedirectUri.value;
      if (dbRefreshToken?.value) refreshToken = dbRefreshToken.value;
      if (dbSyncEmail?.value) syncEmail = dbSyncEmail.value;
    } catch {
      // Abaikan
    }
  }

  return { clientId, clientSecret, redirectUri, refreshToken, syncEmail };
}

function saveToEnv(key, value) {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf8");
    }
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}="${value}"`);
    } else {
      content += (content.endsWith("\n") || content.length === 0 ? "" : "\n") + `${key}="${value}"\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
  } catch (err) {
    console.warn(`Peringatan: Gagal menyimpan ${key} ke .env:`, err?.message);
  }
}

async function fetchPelangganList(prisma) {
  return prisma.pelanggan.findMany({
    where: { deletedAt: null },
    include: {
      kelurahan: true,
      wilayah: {
        include: {
          zona: true,
        },
      },
      paket: true,
    },
    orderBy: [{ kelurahanId: "asc" }, { nama: "asc" }],
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "--help";

  if (command === "--help" || command === "-h") {
    showHelp();
    return;
  }

  let prisma = null;
  try {
    prisma = getPrisma();
  } catch (err) {
    // Abaikan jika database belum siap
  }

  const config = await getOAuthConfig(prisma);

  if (command === "--status") {
    logHeader("Status Integrasi Google Contacts");
    console.log(`• GOOGLE_CLIENT_ID     : ${config.clientId ? C.green + "Tersedia" : C.red + "Belum disetel"}${C.reset}`);
    console.log(`• GOOGLE_CLIENT_SECRET : ${config.clientSecret ? C.green + "Tersedia" : C.red + "Belum disetel"}${C.reset}`);
    console.log(`• GOOGLE_REDIRECT_URI  : ${C.yellow}${config.redirectUri}${C.reset}`);
    console.log(`• GOOGLE_REFRESH_TOKEN : ${config.refreshToken ? C.green + "Tersedia (Sudah Otorisasi)" : C.yellow + "Belum ada otorisasi"}${C.reset}`);
    console.log(`• Email Tersambung     : ${config.syncEmail ? C.cyan + C.bright + config.syncEmail : C.gray + "-"}${C.reset}`);

    if (prisma) {
      try {
        const total = await prisma.pelanggan.count({ where: { deletedAt: null } });
        console.log(`• Total Pelanggan di DB: ${C.bright}${total} data${C.reset}`);
      } catch (e) {
        console.log(`• Total Pelanggan di DB: ${C.red}Koneksi DB bermasalah (${e.message})${C.reset}`);
      }
    }
    return;
  }

  if (command === "--auth") {
    logHeader("Otorisasi Akun Google (Google Contacts)");
    if (!config.clientId || !config.clientSecret) {
      console.log(`${C.red}Error: GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum disetel!${C.reset}`);
      console.log(`\nSilakan isi terlebih dahulu di file .env atau database Pengaturan.`);
      console.log(`Panduan membuat kredensial: buka docs/GOOGLE-CONTACTS-SETUP.md`);
      return;
    }

    const authUrl = getGoogleAuthUrl({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });

    console.log(`Langkah Otorisasi Akun Google:`);
    console.log(`1. Buka tautan berikut di browser:`);
    console.log(`\n${C.cyan}${C.bright}${authUrl}${C.reset}\n`);
    console.log(`2. Login menggunakan akun Google/Gmail tempat kontak ingin disimpan.`);
    console.log(`3. Izinkan akses kontak (Google Contacts).`);
    console.log(`4. Setelah dialihkan atau menerima kode otorisasi (code), salin kodenya.`);
    console.log(`5. Jalankan perintah:`);
    console.log(`   ${C.green}node scripts/sync-google-contacts.mjs --code <KODE_OTORISASI>${C.reset}\n`);
    return;
  }

  if (command === "--code") {
    const code = args[1];
    if (!code) {
      console.log(`${C.red}Error: Harap sertakan kode otorisasi.${C.reset}`);
      console.log(`Contoh: node scripts/sync-google-contacts.mjs --code 4/0AbCdEf123...`);
      return;
    }

    logHeader("Menukar Kode Otorisasi...");
    try {
      const tokens = await exchangeGoogleAuthCode(code, {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
      });

      console.log(`${C.green}✓ Berhasil mendapatkan token dari Google!${C.reset}`);
      if (tokens.email) {
        console.log(`• Akun Email Terhubung: ${C.bright}${C.cyan}${tokens.email}${C.reset}`);
      }

      saveToEnv("GOOGLE_REFRESH_TOKEN", tokens.refreshToken);
      if (tokens.email) saveToEnv("GOOGLE_SYNC_EMAIL", tokens.email);

      if (prisma) {
        try {
          await prisma.pengaturan.upsert({
            where: { key: "GOOGLE_REFRESH_TOKEN" },
            update: { value: tokens.refreshToken },
            create: { key: "GOOGLE_REFRESH_TOKEN", value: tokens.refreshToken },
          });
          if (tokens.email) {
            await prisma.pengaturan.upsert({
              where: { key: "GOOGLE_SYNC_EMAIL" },
              update: { value: tokens.email },
              create: { key: "GOOGLE_SYNC_EMAIL", value: tokens.email },
            });
          }
          console.log(`${C.green}✓ Refresh token dan email tersimpan di database & .env${C.reset}`);
        } catch (e) {
          console.warn("Peringatan saat menyimpan ke DB:", e.message);
        }
      }

      console.log(`\nSekarang Anda dapat menjalankan sinkronisasi dengan perintah:`);
      console.log(`  ${C.green}node scripts/sync-google-contacts.mjs --sync${C.reset}\n`);
    } catch (err) {
      console.log(`${C.red}Gagal menukar kode otorisasi: ${err.message}${C.reset}`);
    }
    return;
  }

  if (command === "--dry-run") {
    logHeader("Pratinjau Data Pelanggan (Dry Run)");
    if (!prisma) {
      console.log(`${C.red}Error: Koneksi DB belum tersedia.${C.reset}`);
      return;
    }

    const pelangganList = await fetchPelangganList(prisma);
    console.log(`Ditemukan ${C.bright}${pelangganList.length} pelanggan${C.reset} di database.\n`);

    const sample = pelangganList.slice(0, 5);
    console.log(`Contoh 5 kontak yang akan dibuat di Google Contacts:`);
    sample.forEach((p, idx) => {
      const formatted = formatPelangganToGoogleContact(p);
      console.log(`\n[${idx + 1}] ${C.bright}${formatted.names?.[0]?.displayName}${C.reset}`);
      console.log(`    Telepon   : ${formatted.phoneNumbers?.[0]?.value || "-"}`);
      console.log(`    Alamat    : ${formatted.addresses?.[0]?.formattedValue || "-"}`);
      console.log(`    Kelurahan : ${p.kelurahan?.nama || "-"}`);
      console.log(`    Status    : ${p.status}`);
    });

    if (pelangganList.length > 5) {
      console.log(`\n... dan ${pelangganList.length - 5} pelanggan lainnya.`);
    }
    return;
  }

  if (command === "--export-csv") {
    const filename = args[1] || `google_contacts_${new Date().toISOString().split("T")[0]}.csv`;
    logHeader(`Mengekspor ke Google Contacts CSV: ${filename}`);

    if (!prisma) {
      console.log(`${C.red}Error: Koneksi DB belum tersedia.${C.reset}`);
      return;
    }

    const pelangganList = await fetchPelangganList(prisma);
    const csvData = generateGoogleContactsCsv(pelangganList, "Pelanggan WastePay");

    fs.writeFileSync(filename, "\uFEFF" + csvData, "utf8");
    console.log(`${C.green}✓ Berhasil mengekspor ${pelangganList.length} pelanggan ke file:${C.reset}`);
    console.log(`  ${path.resolve(filename)}`);
    console.log(`\nCara Impor di Google Contacts:`);
    console.log(`1. Buka https://contacts.google.com/`);
    console.log(`2. Klik menu 'Impor' di panel kiri.`);
    console.log(`3. Pilih file '${filename}'.`);
    console.log(`4. Selesai! Semua kontak akan masuk dengan label 'Pelanggan WastePay'.\n`);
    return;
  }

  if (command === "--export-vcf") {
    const filename = args[1] || `google_contacts_${new Date().toISOString().split("T")[0]}.vcf`;
    logHeader(`Mengekspor ke vCard (.vcf): ${filename}`);

    if (!prisma) {
      console.log(`${C.red}Error: Koneksi DB belum tersedia.${C.reset}`);
      return;
    }

    const pelangganList = await fetchPelangganList(prisma);
    const vcfData = generateVCard(pelangganList, "Pelanggan WastePay");

    fs.writeFileSync(filename, vcfData, "utf8");
    console.log(`${C.green}✓ Berhasil mengekspor ${pelangganList.length} pelanggan ke file:${C.reset}`);
    console.log(`  ${path.resolve(filename)}`);
    return;
  }

  if (command === "--sync") {
    logHeader("Sinkronisasi Pelanggan ke Google Contacts via People API");

    if (!config.clientId || !config.clientSecret) {
      console.log(`${C.red}Error: GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum disetel!${C.reset}`);
      return;
    }

    if (!config.refreshToken) {
      console.log(`${C.red}Error: Belum ada otorisasi akun Google (GOOGLE_REFRESH_TOKEN tidak ditemukan).${C.reset}`);
      console.log(`Jalankan langkah otorisasi terlebih dahulu:`);
      console.log(`  node scripts/sync-google-contacts.mjs --auth`);
      return;
    }

    if (!prisma) {
      console.log(`${C.red}Error: Koneksi DB belum tersedia.${C.reset}`);
      return;
    }

    console.log(`1. Merefresh Access Token Google...`);
    let accessToken = "";
    try {
      accessToken = await refreshGoogleAccessToken(config.refreshToken, {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
      });
      console.log(`${C.green}✓ Access Token berhasil didapatkan.${C.reset}`);
    } catch (err) {
      console.log(`${C.red}Gagal merefresh access token: ${err.message}${C.reset}`);
      console.log(`Silakan lakukan otorisasi ulang dengan: node scripts/sync-google-contacts.mjs --auth`);
      return;
    }

    const currentEmail = await getUserEmail(accessToken);
    if (currentEmail) {
      console.log(`• Target Akun Email: ${C.cyan}${C.bright}${currentEmail}${C.reset}`);
    }

    console.log(`\n2. Mengambil data pelanggan dari database...`);
    const pelangganList = await fetchPelangganList(prisma);
    console.log(`• Ditemukan ${C.bright}${pelangganList.length} pelanggan${C.reset}`);

    console.log(`\n3. Menjalankan sinkronisasi via Google People API...`);
    const updateExisting = args.includes("--update");
    const syncRes = await syncPelangganToGooglePeopleApi({
      customers: pelangganList,
      accessToken,
      groupName: "Pelanggan WastePay",
      updateExisting,
    });

    console.log(`\n${C.green}${C.bright}══════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.green}${C.bright}  HASIL SINKRONISASI GOOGLE CONTACTS${C.reset}`);
    console.log(`${C.green}${C.bright}══════════════════════════════════════════════════════════${C.reset}`);
    console.log(`• Total Pelanggan       : ${syncRes.total}`);
    console.log(`• Kontak Baru Dibuat    : ${C.green}${syncRes.created}${C.reset}`);
    console.log(`• Kontak Diperbarui     : ${C.yellow}${syncRes.updated}${C.reset}`);
    console.log(`• Kontak Dilewati (Ada) : ${C.gray}${syncRes.skipped}${C.reset}`);
    console.log(`• Gagal                 : ${syncRes.failed > 0 ? C.red + syncRes.failed : C.green + 0}${C.reset}`);

    if (syncRes.errors.length > 0) {
      console.log(`\n${C.red}Rincian Error:${C.reset}`);
      syncRes.errors.slice(0, 5).forEach((e) => console.log(` - ${e}`));
      if (syncRes.errors.length > 5) {
        console.log(` ... dan ${syncRes.errors.length - 5} error lainnya.`);
      }
    }

    try {
      await prisma.pengaturan.upsert({
        where: { key: "GOOGLE_LAST_SYNC_AT" },
        update: { value: new Date().toISOString() },
        create: { key: "GOOGLE_LAST_SYNC_AT", value: new Date().toISOString() },
      });
    } catch {
      // Abaikan jika gagal update timestamp
    }

    console.log(`\n${C.green}✓ Selesai! Silakan cek di https://contacts.google.com/${C.reset}\n`);
    return;
  }

  showHelp();
}

main()
  .catch((e) => {
    console.error(`\n${C.red}Error tidak terduga:${C.reset}`, e);
    process.exit(1);
  });
