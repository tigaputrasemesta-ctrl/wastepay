/**
 * Modul Integrasi Google Contacts & Google People API untuk WastePay.
 * Mengelola sinkronisasi data pelanggan ke Google Contacts sebuah akun Google (email).
 */

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface PelangganForContact {
  id: number;
  nama: string;
  noTelepon: string;
  kodePelanggan: string;
  kategori?: string | null;
  alamat?: string | null;
  rtRw?: string | null;
  patokanLokasi?: string | null;
  penanggungjawab?: string | null;
  status?: string | null;
  customTarif?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: Date | string | null;
  kelurahan?: { nama: string } | null;
  wilayah?: { nama: string; zona?: { nama: string } | null } | null;
  paket?: { nama: string; harga?: number | null } | null;
}

export interface GoogleContactPerson {
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  addresses?: Array<{
    formattedValue?: string;
    streetAddress?: string;
    city?: string;
    region?: string;
    country?: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
    department?: string;
  }>;
  biographies?: Array<{
    value: string;
    contentType?: "TEXT_PLAIN" | "TEXT_HTML";
  }>;
  userDefined?: Array<{
    key: string;
    value: string;
  }>;
  memberships?: Array<{
    contactGroupMembership?: {
      contactGroupResourceName?: string;
    };
  }>;
}

export interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
  targetEmail?: string | null;
  groupResourceName?: string | null;
}

/**
 * Normalisasi nomor telepon ke format E.164 internasional (+62...)
 * Google Contacts & WhatsApp menggunakan standar ini.
 */
export function formatPhoneE164(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^\d+]/g, "").trim();
  if (clean.startsWith("+")) {
    return clean;
  }
  if (clean.startsWith("62")) {
    return "+" + clean;
  }
  if (clean.startsWith("0")) {
    return "+62" + clean.slice(1);
  }
  return "+62" + clean;
}

/**
 * Bangun URL Oauth2 untuk mendapatkan persetujuan pengguna
 */
export function getGoogleAuthUrl(config: GoogleOAuthConfig, state?: string): string {
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
  if (state) {
    params.set("state", state);
  }
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Tukar authorization code dengan access token & refresh token
 */
export async function exchangeGoogleAuthCode(
  code: string,
  config: GoogleOAuthConfig
): Promise<{ accessToken: string; refreshToken: string; email: string | null }> {
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
  const accessToken = data.access_token as string;
  const refreshToken = data.refresh_token as string;

  if (!refreshToken) {
    throw new Error("Refresh token tidak diterima dari Google. Pastikan consent screen menyertakan prompt=consent dan access_type=offline.");
  }

  const email = await getUserEmail(accessToken);
  return { accessToken, refreshToken, email };
}

/**
 * Dapatkan access token baru menggunakan refresh token
 */
export async function refreshGoogleAccessToken(
  refreshToken: string,
  config: GoogleOAuthConfig
): Promise<string> {
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
  return data.access_token as string;
}

/**
 * Ambil email akun Google pemilik token
 */
export async function getUserEmail(accessToken: string): Promise<string | null> {
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

/**
 * Cari atau buat Label / Contact Group "Pelanggan WastePay" di Google Contacts
 */
export async function getOrCreateGoogleContactGroup(
  accessToken: string,
  groupName: string = "Pelanggan WastePay"
): Promise<string | null> {
  try {
    // 1. Cek daftar grup yang ada
    const listRes = await fetch("https://people.googleapis.com/v1/contactGroups?pageSize=100", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (listRes.ok) {
      const data = await listRes.json();
      const groups = data.contactGroups || [];
      const found = groups.find((g: any) => g.name === groupName || g.formattedName === groupName);
      if (found?.resourceName) {
        return found.resourceName;
      }
    }

    // 2. Buat grup baru jika belum ada
    const createRes = await fetch("https://people.googleapis.com/v1/contactGroups", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contactGroup: {
          name: groupName,
        },
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

/**
 * Format satu objek pelanggan ke objek ContactPerson Google People API
 */
export function formatPelangganToGoogleContact(
  pelanggan: PelangganForContact,
  groupResourceName?: string | null
): GoogleContactPerson {
  const phone = formatPhoneE164(pelanggan.noTelepon);
  const kelurahan = pelanggan.kelurahan?.nama || "";
  const zona = pelanggan.wilayah?.zona?.nama || pelanggan.wilayah?.nama || "";
  const paketNama = pelanggan.paket?.nama || "";
  const kategori = pelanggan.kategori ? pelanggan.kategori.replace(/_/g, " ").toUpperCase() : "";

  // Pisahkan nama depan dan belakang untuk format Google Contact
  const nameParts = (pelanggan.nama || "").trim().split(/\s+/);
  const givenName = nameParts[0] || "Pelanggan";
  const familyName = nameParts.slice(1).join(" ") || "";
  const displayName = `${pelanggan.nama} [${pelanggan.kodePelanggan}]`;

  // Alamat terformat
  const addressParts = [
    pelanggan.alamat,
    pelanggan.rtRw ? `RT/RW ${pelanggan.rtRw}` : null,
    kelurahan ? `Kel. ${kelurahan}` : null,
    zona ? `Zona ${zona}` : null,
  ].filter(Boolean);
  const formattedAddress = addressParts.join(", ");

  // Catatan ringkas
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

  const contact: GoogleContactPerson = {
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

/**
 * Ambil kontak yang sudah ada di akun Google untuk deteksi duplikasi (idempotent)
 */
export async function fetchExistingGoogleContacts(
  accessToken: string
): Promise<Map<string, { resourceName: string; etag: string; displayName: string }>> {
  const map = new Map<string, { resourceName: string; etag: string; displayName: string }>();
  let pageToken: string | undefined = undefined;

  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", "names,phoneNumbers,userDefined,metadata");
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      console.warn("Gagal membaca existing connections dari Google:", res.status);
      break;
    }

    const data = await res.json();
    const connections = data.connections || [];

    for (const conn of connections) {
      const resourceName = conn.resourceName;
      const etag = conn.etag;
      const displayName = conn.names?.[0]?.displayName || "";

      // 1. Cek via custom userDefined field
      const userDefs = conn.userDefined || [];
      const kodeDef = userDefs.find((u: any) => u.key === "WastePayKode");
      if (kodeDef?.value) {
        map.set(`kode:${kodeDef.value.trim().toUpperCase()}`, { resourceName, etag, displayName });
      }

      // 2. Cek via kode di displayName [KODE]
      const codeMatch = displayName.match(/\[([A-Za-z0-9\-_]+)\]/);
      if (codeMatch && codeMatch[1]) {
        map.set(`kode:${codeMatch[1].trim().toUpperCase()}`, { resourceName, etag, displayName });
      }

      // 3. Cek via nomor telepon yang dinormalisasi
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

/**
 * Sinkronisasi daftar pelanggan ke Google People API
 */
export async function syncPelangganToGooglePeopleApi(params: {
  customers: PelangganForContact[];
  accessToken: string;
  groupName?: string;
  updateExisting?: boolean;
}): Promise<SyncResult> {
  const { customers, accessToken, groupName = "Pelanggan WastePay", updateExisting = false } = params;

  const result: SyncResult = {
    total: customers.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  // 1. Buat / Dapatkan Contact Group Label
  const groupResourceName = await getOrCreateGoogleContactGroup(accessToken, groupName);
  result.groupResourceName = groupResourceName;

  // 2. Baca kontak existing untuk pencegahan duplikasi
  const existingMap = await fetchExistingGoogleContacts(accessToken);

  // 3. Klasifikasikan kontak: baru vs sudah ada
  const toCreate: GoogleContactPerson[] = [];
  const toUpdate: { contact: GoogleContactPerson; existingResourceName: string; etag: string }[] = [];

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

  // 4. Batch Create (Google People API batchCreateContacts mendukung hingga 200 kontak per panggilan)
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
    } catch (err: any) {
      result.failed += batch.length;
      result.errors.push(`Koneksi batch create gagal: ${err?.message || err}`);
    }
  }

  // 5. Update jika diminta
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
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Error update: ${err?.message || err}`);
    }
  }

  return result;
}

/**
 * Escape field untuk CSV standard RFC 4180
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Format CSV resmi Google Contacts siap diimpor ke contacts.google.com
 */
export function generateGoogleContactsCsv(
  pelangganList: PelangganForContact[],
  groupLabel: string = "Pelanggan WastePay"
): string {
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

  const rows: string[] = [headers.join(",")];

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
      escapeCsv(fullName), // Name
      escapeCsv(givenName), // Given Name
      "", // Additional Name
      escapeCsv(familyName), // Family Name
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
      escapeCsv(notesLines.join("\n")), // Notes
      "", "",
      escapeCsv(`* myContacts ::: ${groupLabel}`), // Group Membership
      "", "", // Email 1
      "Mobile", // Phone 1 - Type
      escapeCsv(phone), // Phone 1 - Value
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
      escapeCsv(`Pelanggan ${kategori}`), // Organization 1 - Title
      escapeCsv(zona), // Organization 1 - Department
    ];

    rows.push(row.join(","));
  }

  return rows.join("\r\n");
}

/**
 * Format vCard 3.0 (.vcf) standar universal untuk Google Contacts / Android / iOS
 */
export function generateVCard(
  pelangganList: PelangganForContact[],
  categoryLabel: string = "Pelanggan WastePay"
): string {
  const vcards: string[] = [];

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
