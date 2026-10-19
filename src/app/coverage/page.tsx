import type { Metadata } from "next";
import StarlinkCoverageMapWrapper from "@/components/map/StarlinkCoverageMapWrapper";

export const metadata: Metadata = {
  title: "Peta Jangkauan & Cakupan Layanan (Coverage Map) | UPS HERU Depok",
  description:
    "Cek jangkauan pengangkutan sampah rutin UPS HERU Kota Depok secara real-time bergaya Starlink Map. Ketik alamat atau gunakan GPS Anda untuk cek apakah lingkungan Anda sudah terlayani aktif.",
  keywords: [
    "coverage map ups heru",
    "peta jangkauan sampah depok",
    "cek rute truk sampah",
    "retribusi sampah cilodong",
    "kalibaru depok jemput sampah",
    "starlink map coverage depok",
  ],
  openGraph: {
    title: "Peta Jangkauan Layanan UPS HERU Kota Depok (Starlink Style)",
    description:
      "Visualisasi interaktif 23 blok operasional, 4 kelurahan terlayani, dan cek status jemput sampah otomatis lewat GPS/alamat rumah Anda.",
    type: "website",
    url: "/coverage",
  },
};

export default function CoveragePage() {
  return (
    <main className="w-full h-screen overflow-hidden bg-[#070b14]">
      <StarlinkCoverageMapWrapper />
    </main>
  );
}
