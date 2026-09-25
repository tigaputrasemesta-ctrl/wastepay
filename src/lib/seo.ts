/**
 * Konfigurasi & Helper SEO Terpusat UPS HERU (UPS HERU Kota Depok)
 * Memastikan metadata konsisten, canonical URL valid, dan structured data (JSON-LD) sesuai standar Google Search.
 */

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "https://upsheru.com";
  return url.replace(/\/+$/, "");
}

export const SITE_CONFIG = {
  name: "UPS HERU",
  shortName: "UPS HERU",
  legalName: "CV Hero Zero Waste",
  unitName: "Unit Pengelolaan & Retribusi Kebersihan (TPS 3R)",
  titleDefault: "UPS HERU - Pengelolaan & Retribusi Sampah Kota Depok",
  titleTemplate: "%s | UPS HERU Depok",
  description:
    "Layanan pengelolaan sampah terpadu Kota Depok: penjemputan terjadwal, pelacakan armada truk sampah real-time, transparansi tarif retribusi, dan pembayaran digital via QRIS.",
  keywords: [
    "pengelolaan sampah depok",
    "retribusi sampah depok",
    "tps 3r depok",
    "ups heru",
    "wastepay",
    "layanan angkut sampah depok",
    "jemput sampah depok",
    "bayar iuran sampah online",
    "cek tagihan sampah depok",
    "kebersihan cilodong depok",
    "zero waste depok",
    "dinas lingkungan hidup depok",
  ],
  authors: [{ name: "UPS HERU / CV Hero Zero Waste", url: "https://upsheru.com" }],
  creator: "UPS HERU Kota Depok",
  publisher: "UPS HERU Kota Depok",
  telephone: "+62 814-0078-2617",
  email: "cv.herozerowaste@gmail.com",
  address: {
    streetAddress: "Jl. Kandang Ayam, Kel. Kalibaru",
    addressLocality: "Kec. Cilodong, Kota Depok",
    addressRegion: "Jawa Barat",
    postalCode: "16414",
    addressCountry: "ID",
  },
  geo: {
    latitude: -6.424838,
    longitude: 106.832667,
  },
  areaServed: {
    name: "Kota Depok",
    subdistricts: ["Cilodong", "Kalibaru", "Sukmajaya", "Pancoran Mas", "Tapos"],
  },
};

/**
 * Schema.org JSON-LD untuk LocalBusiness & WasteManagement Service.
 * Meningkatkan visibilitas Rich Snippet & Google Knowledge Graph lokal Depok.
 */
export function generateLocalBusinessJsonLd() {
  const baseUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["LocalBusiness", "RecyclingCenter"],
        "@id": `${baseUrl}/#organization`,
        name: SITE_CONFIG.name,
        legalName: SITE_CONFIG.legalName,
        alternateName: ["UPS HERU Depok", "UPS HERU", "TPS 3R Kalibaru"],
        url: baseUrl,
      logo: `${baseUrl}/ups-heru-logo.jpg`,
        image: `${baseUrl}/opengraph-image`,
        description: SITE_CONFIG.description,
        telephone: SITE_CONFIG.telephone,
        email: SITE_CONFIG.email,
        priceRange: "Rp 30.000 - Rp 150.000",
        address: {
          "@type": "PostalAddress",
          streetAddress: SITE_CONFIG.address.streetAddress,
          addressLocality: SITE_CONFIG.address.addressLocality,
          addressRegion: SITE_CONFIG.address.addressRegion,
          postalCode: SITE_CONFIG.address.postalCode,
          addressCountry: SITE_CONFIG.address.addressCountry,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: SITE_CONFIG.geo.latitude,
          longitude: SITE_CONFIG.geo.longitude,
        },
        areaServed: {
          "@type": "AdministrativeArea",
          name: SITE_CONFIG.areaServed.name,
        },
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ],
            opens: "07:00",
            closes: "17:00",
          },
        ],
        sameAs: [
          "https://wa.me/6281400782617",
        ],
      },
      {
        "@type": "GovernmentService",
        "@id": `${baseUrl}/#service`,
        name: "Layanan Pengelolaan dan Retribusi Sampah Kota Depok",
        serviceType: "Waste Collection & Disposal",
        provider: {
          "@id": `${baseUrl}/#organization`,
        },
        areaServed: {
          "@type": "City",
          name: SITE_CONFIG.areaServed.name,
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Paket Retribusi Sampah UPS HERU",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Retribusi Rumah Tangga / Warga",
                description: "Pengangkutan sampah rumah tangga rutin 2-3 kali seminggu.",
              },
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Retribusi Niaga & Toko / UMKM",
                description: "Pengangkutan sampah komersial & ruko harian atau sesuai volume.",
              },
            },
          ],
        },
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: SITE_CONFIG.name,
        description: SITE_CONFIG.description,
        publisher: {
          "@id": `${baseUrl}/#organization`,
        },
        inLanguage: "id-ID",
      },
    ],
  };
}
