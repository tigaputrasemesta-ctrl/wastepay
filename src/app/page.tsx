import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import PublicNavbar from "@/components/PublicNavbar";
import { generateLocalBusinessJsonLd } from "@/lib/seo";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import MobileActionPortal from "@/components/landing/MobileActionPortal";

// Edge ISR Caching: 180 seconds cache di Edge CDN Vercel untuk kecepatan <50ms
export const revalidate = 180;

export const metadata: Metadata = {
  title: "UPS HERU - Layanan Pengangkutan Sampah & Retribusi",
  description:
    "Layanan pengangkutan sampah terjadwal dan pembayaran retribusi digital terpadu oleh UPS HERU. Cek tagihan & bayar QRIS, lapor pengaduan cepat, dan cek jadwal penjemputan rutin.",
  alternates: {
    canonical: "/",
  },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-[#059669] selection:text-white overflow-x-hidden">
      <JsonLd data={generateLocalBusinessJsonLd()} />

      {/* ── 1. Navbar Publik Ringkas ── */}
      <PublicNavbar />

      {/* ── 2. Mobile-First Action Portal (Fokus Fungsi & Responsibilitas HP) ── */}
      <main className="pb-12">
        <MobileActionPortal />
      </main>

      {/* ── 3. Floating WhatsApp Hotline ── */}
      <FloatingWhatsApp phoneNumber="6281400782617" />
    </div>
  );
}
