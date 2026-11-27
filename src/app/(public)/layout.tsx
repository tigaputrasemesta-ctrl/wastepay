import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { MessageCircle } from "lucide-react";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import MobileBottomNav from "@/components/mobile/MobileBottomNav";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import { resolveTenantByHost, PILOT_TENANT } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  let ctx: ReturnType<typeof resolveTenantByHost> | null = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    ctx = resolveTenantByHost(host);
  } catch {
    // static fallback
  }

  const tenant = ctx && ctx.isValid ? ctx.tenant : PILOT_TENANT;
  const isCore = Boolean(ctx?.isCore);
  if (isCore) {
    return {
      title: {
        default: "O2W HERO — Kemitraan & Portal SaaS",
        template: "%s | O2W HERO",
      },
      description:
        "Portal pendaftaran kemitraan & solusi digitalisasi TPS3R/Bank Sampah se-Indonesia oleh O2W HERO.",
    };
  }

  const brandName = tenant.branding?.namaMitra || tenant.namaMitra || "UPS HERU";
  const city = tenant.branding?.kota || "Kota Depok";
  const titleLabel = ctx?.isPilot === false ? brandName : "UPS HERU Depok";

  return {
    title: {
      default: `Portal Layanan Warga | ${titleLabel}`,
      template: `%s | ${titleLabel}`,
    },
    description: `Portal resmi layanan warga ${city}: pendaftaran jemput sampah, cek & bayar tagihan retribusi, dan pusat pengaduan kebersihan ${brandName}.`,
  };
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx: ReturnType<typeof resolveTenantByHost> | null = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    ctx = resolveTenantByHost(host);
  } catch {
    // static fallback
  }

  const isCore = Boolean(ctx?.isCore);
  const tenant = ctx && ctx.isValid ? ctx.tenant : PILOT_TENANT;
  const brandName = isCore ? "O2W HERO" : tenant.branding?.namaMitra || tenant.namaMitra || "UPS HERU";
  const tagline = isCore
    ? "Platform SaaS Ekosistem Sampah & Retribusi"
    : tenant.branding?.tagline || "Layanan Pengangkutan Sampah & Retribusi";
  const logoUrl = tenant.branding?.logoUrl || (isCore ? "/images/o2w-logo.svg" : "/ups-heru-logo.jpg");
  const city = isCore ? "Indonesia" : tenant.branding?.kota || "Kota Depok";
  const rawWa = tenant.branding?.whatsappKontak || "6281400782617";
  const whatsappDigits = rawWa.replace(/\D/g, "").replace(/^0/, "62") || "6281400782617";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-800 selection:text-white transition-colors duration-200 pb-20 md:pb-0">
      {/* Top Notification Banner */}
      <section
        aria-label="Informasi Layanan"
        className={
          isCore
            ? "bg-slate-950 text-slate-100 text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2 border-b border-slate-800"
            : "bg-emerald-900 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2"
        }
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>
          {isCore
            ? "Platform SaaS Multi-Tenant Pengelolaan Sampah • O2W HERO"
            : `Mitra Pengangkutan Sampah & Retribusi Warga ${city}`}
        </span>
      </section>

      {/* Responsive Navbar */}
      <PublicNavbar
        brandName={brandName}
        tagline={tagline}
        logoUrl={logoUrl}
        whatsappDigits={whatsappDigits}
        fiturAktif={tenant.fiturAktif}
      />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 focus:outline-none">
        {children}
      </main>

      {/* Global Comprehensive Municipal Footer */}
      <PublicFooter
        brandName={brandName}
        city={city}
        logoUrl={logoUrl}
        whatsappDigits={whatsappDigits}
        alamatKantor={tenant.branding?.alamat}
        email={tenant.branding?.emailKontak}
      />

      {/* Mobile-First Fixed Bottom Navigation Bar (md:hidden) */}
      <MobileBottomNav />

      {/* Floating WhatsApp Action Button */}
      <FloatingWhatsApp phoneNumber={whatsappDigits} brandName={brandName} />
    </div>
  );
}
