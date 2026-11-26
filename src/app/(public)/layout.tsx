import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { MessageCircle } from "lucide-react";
import AnimatedDumpTruck from "@/components/AnimatedDumpTruck";
import PublicNavbar from "@/components/PublicNavbar";
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
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-emerald-800 selection:text-white transition-colors duration-200">
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
      />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 focus:outline-none">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 py-12 px-6 transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
          <div className="flex-1 max-w-sm space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                <AnimatedDumpTruck size="xs" theme="white" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {brandName}<span className="text-emerald-700 dark:text-emerald-400">.</span>
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-medium">
              Sistem Pengelolaan Sampah & Retribusi Terpadu {city}. Layanan jemput sampah terjadwal dan pembayaran iuran bulanan yang transparan.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs font-medium">
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider text-xs">Layanan Warga</p>
              <ul className="space-y-2 text-slate-600 dark:text-zinc-400">
                <li><Link href="/pickup" className="hover:text-emerald-800 dark:hover:text-emerald-400 text-emerald-700 dark:text-emerald-400 font-bold">Pickup Sekali Angkut</Link></li>
                <li><Link href="/marketplace" className="hover:text-emerald-800 dark:hover:text-emerald-400 font-bold">Toko {brandName}</Link></li>
                <li><Link href="/bayar" className="hover:text-emerald-800 dark:hover:text-emerald-400">Cek Tagihan Bulanan</Link></li>
                <li><Link href="/tarif" className="hover:text-emerald-800 dark:hover:text-emerald-400">Daftar Paket Retribusi</Link></li>
                <li><Link href="/pengaduan" className="hover:text-emerald-800 dark:hover:text-emerald-400">Lapor Sampah Menumpuk</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5">
              <p className="font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider text-xs">Pendaftaran</p>
              <ul className="space-y-2 text-slate-600 dark:text-zinc-400">
                <li><Link href="/daftar" className="hover:text-emerald-800 dark:hover:text-emerald-400">Daftar Rumah Tangga</Link></li>
                <li><Link href="/daftar" className="hover:text-emerald-800 dark:hover:text-emerald-400">Daftar Toko / Usaha</Link></li>
                <li><Link href="/daftar" className="hover:text-emerald-800 dark:hover:text-emerald-400">Kerjasama Pengurus RT/RW</Link></li>
                <li><Link href="/mitra" className="hover:text-emerald-800 dark:hover:text-emerald-400 font-bold text-emerald-700 dark:text-emerald-400">Gabung Mitra O2W HERO</Link></li>
              </ul>
            </div>
            <div className="space-y-2.5 col-span-2 sm:col-span-1">
              <p className="font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider text-xs">Kontak Bantuan</p>
              <ul className="space-y-2 text-slate-600 dark:text-zinc-400">
                <li>
                  <a href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold hover:underline">
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>WhatsApp Bot 24 Jam</span>
                  </a>
                </li>
                <li>{city}</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
          <p>© 2026 {brandName} ({city}). Hak Cipta Dilindungi.</p>
          <p className="font-medium">Ekonomi Sirkular & Pengelolaan Sampah Terpadu</p>
        </div>
      </footer>
    </div>
  );
}
