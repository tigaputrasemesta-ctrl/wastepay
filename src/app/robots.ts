import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/lacak",
          "/bayar",
          "/tarif",
          "/daftar",
          "/pengaduan",
          "/artikel",
          "/unduh",
        ],
        disallow: [
          // Rute admin / operasional internal
          "/dashboard",
          "/pelanggan",
          "/tagihan",
          "/petugas",
          "/rute",
          "/jadwal",
          "/pengangkutan",
          "/komplain",
          "/pengeluaran",
          "/laporan",
          "/pengumuman",
          "/notifikasi",
          "/rekonsiliasi",
          "/tpa",
          "/transit",
          "/users",
          "/audit-log",
          "/absensi",
          "/survei",
          "/manajemen-tarif",
          "/pengaturan",
          "/sticker",
          "/kendaraan",
          "/klaim",
          "/zona",
          // API endpoints
          "/api/",
          // Autentikasi & Aplikasi Mobile Driver
          "/login",
          "/m",
          // Faktur spesifik & dokumen cetak kasir (privasi data keuangan warga)
          "/bayar-tagihan",
          "/invoice-tagihan",
          "/kwitansi",
          "/*-cetak",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
