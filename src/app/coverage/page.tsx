import type { Metadata } from "next";
import StarlinkCoverageMapWrapper from "@/components/map/StarlinkCoverageMapWrapper";

export const metadata: Metadata = {
  title: "Peta Jangkauan Layanan & Area Warga Terdaftar | UPS HERU Depok",
  description:
    "Cek jangkauan pengangkutan sampah rutin UPS HERU Kota Depok secara real-time. Temukan rekomendasi area sekitar warga yang sudah terdaftar, ketik alamat atau gunakan GPS untuk cek status jemput sampah rumah Anda.",
  keywords: [
    "coverage map ups heru",
    "peta jangkauan sampah depok",
    "area warga terdaftar depok",
    "cek rute truk sampah",
    "retribusi sampah cilodong",
    "kalibaru depok jemput sampah",
  ],
  openGraph: {
    title: "Peta Jangkauan Layanan & Area Warga Terdaftar — UPS HERU Depok",
    description:
      "Visualisasi interaktif 23 klaster warga terdaftar, jadwal rute armada pengangkut, dan cek status jemput sampah otomatis lewat GPS/alamat rumah Anda.",
    type: "website",
    url: "/coverage",
  },
};

export default function CoveragePage() {
  return (
    <main className="w-full h-screen overflow-hidden bg-slate-100">
      <StarlinkCoverageMapWrapper />
    </main>
  );
}
