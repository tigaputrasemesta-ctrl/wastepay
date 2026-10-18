import { describe, expect, it } from "vitest";
import {
  formatPhoneE164,
  formatPelangganToGoogleContact,
  generateGoogleContactsCsv,
  generateVCard,
  getGoogleAuthUrl,
  type PelangganForContact,
} from "../src/lib/google-contacts";

describe("Google Contacts: formatPhoneE164", () => {
  it("mengonversi nomor lokal 08xx ke +628xx", () => {
    expect(formatPhoneE164("081234567890")).toBe("+6281234567890");
    expect(formatPhoneE164("0812-3456-7890")).toBe("+6281234567890");
    expect(formatPhoneE164("0812 3456 7890")).toBe("+6281234567890");
  });

  it("mempertahankan nomor internasional +62xx", () => {
    expect(formatPhoneE164("+6281234567890")).toBe("+6281234567890");
    expect(formatPhoneE164("+62-812-3456-7890")).toBe("+6281234567890");
  });

  it("menambahkan prefix + pada nomor 62xx tanpa plus", () => {
    expect(formatPhoneE164("6281234567890")).toBe("+6281234567890");
  });

  it("menangani string kosong", () => {
    expect(formatPhoneE164("")).toBe("");
  });
});

describe("Google Contacts: formatPelangganToGoogleContact", () => {
  const samplePelanggan: PelangganForContact = {
    id: 1,
    nama: "Bpk Budi Santoso",
    noTelepon: "0812-1000-001",
    kodePelanggan: "TES-001",
    kategori: "level_1",
    alamat: "Jl. Merdeka No. 1, Cilodong",
    rtRw: "001/002",
    patokanLokasi: "Depan warung hijau",
    penanggungjawab: "Ibu Budi",
    status: "aktif",
    latitude: -6.401,
    longitude: 106.825,
    kelurahan: { nama: "Cilodong" },
    wilayah: { nama: "RT 01", zona: { nama: "Zona A" } },
    paket: { nama: "Paket Reguler" },
  };

  it("membentuk objek ContactPerson dengan struktur Google People API valid", () => {
    const contact = formatPelangganToGoogleContact(samplePelanggan, "contactGroups/group123");

    // Nama
    expect(contact.names?.[0].givenName).toBe("Bpk");
    expect(contact.names?.[0].familyName).toBe("Budi Santoso");
    expect(contact.names?.[0].displayName).toBe("Bpk Budi Santoso - Zona A [TES-001]");

    // Telepon
    expect(contact.phoneNumbers?.[0].value).toBe("+628121000001");
    expect(contact.phoneNumbers?.[0].type).toBe("mobile");

    // Alamat
    expect(contact.addresses?.[0].streetAddress).toBe("Jl. Merdeka No. 1, Cilodong");
    expect(contact.addresses?.[0].city).toBe("Cilodong");
    expect(contact.addresses?.[0].formattedValue).toContain("Jl. Merdeka No. 1, Cilodong");
    expect(contact.addresses?.[0].formattedValue).toContain("RT/RW 001/002");

    // Organisasi
    expect(contact.organizations?.[0].name).toBe("WastePay");

    // Catatan / Bio
    expect(contact.biographies?.[0].value).toContain("Kode Pelanggan: TES-001");
    expect(contact.biographies?.[0].value).toContain("Status: AKTIF");
    expect(contact.biographies?.[0].value).toContain("Kelurahan: Cilodong");
    expect(contact.biographies?.[0].value).toContain("Patokan: Depan warung hijau");

    // User defined
    const kodeDef = contact.userDefined?.find((u) => u.key === "WastePayKode");
    expect(kodeDef?.value).toBe("TES-001");

    // Memberships
    expect(contact.memberships?.[0].contactGroupMembership?.contactGroupResourceName).toBe("contactGroups/group123");
  });
});

describe("Google Contacts: getGoogleAuthUrl", () => {
  it("membentuk URL OAuth dengan scope contacts dan userinfo.email", () => {
    const urlStr = getGoogleAuthUrl({
      clientId: "test-client-id.apps.googleusercontent.com",
      clientSecret: "test-secret",
      redirectUri: "http://localhost:3000/api/integrasi/google-contacts/callback",
    });

    const parsed = new URL(urlStr);
    expect(parsed.origin).toBe("https://accounts.google.com");
    expect(parsed.pathname).toBe("/o/oauth2/v2/auth");
    expect(parsed.searchParams.get("client_id")).toBe("test-client-id.apps.googleusercontent.com");
    expect(parsed.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/integrasi/google-contacts/callback");
    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
    expect(parsed.searchParams.get("scope")).toContain("https://www.googleapis.com/auth/contacts");
    expect(parsed.searchParams.get("scope")).toContain("https://www.googleapis.com/auth/userinfo.email");
  });
});

describe("Google Contacts: File Generators (CSV & vCard)", () => {
  const pelangganList: PelangganForContact[] = [
    {
      id: 1,
      nama: "Andi Wijaya",
      noTelepon: "081211112222",
      kodePelanggan: "KAL-001",
      kategori: "level_1",
      alamat: "Gg. Kenanga No. 5",
      kelurahan: { nama: "Kalibaru" },
      status: "aktif",
    },
  ];

  it("generateGoogleContactsCsv: menghasilkan CSV header dan baris data Google Contacts yang valid", () => {
    const csv = generateGoogleContactsCsv(pelangganList, "Pelanggan WastePay");
    const lines = csv.split("\r\n");

    expect(lines[0]).toContain("Name,Given Name");
    expect(lines[0]).toContain("Phone 1 - Value");
    expect(lines[0]).toContain("Group Membership");

    expect(lines[1]).toContain("Andi Wijaya [KAL-001]");
    expect(lines[1]).toContain("+6281211112222");
    expect(lines[1]).toContain("WastePay");
  });

  it("generateVCard: menghasilkan vCard 3.0 valid", () => {
    const vcf = generateVCard(pelangganList, "Pelanggan WastePay");

    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("VERSION:3.0");
    expect(vcf).toContain("FN:Andi Wijaya [KAL-001]");
    expect(vcf).toContain("TEL;TYPE=CELL,VOICE:+6281211112222");
    expect(vcf).toContain("CATEGORIES:Pelanggan WastePay");
    expect(vcf).toContain("END:VCARD");
  });
});
