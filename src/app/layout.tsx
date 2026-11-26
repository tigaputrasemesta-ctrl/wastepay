import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { resolveTenantByHost, PILOT_TENANT } from "@/lib/tenant";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

import { getSiteUrl, SITE_CONFIG } from "@/lib/seo";

async function resolveLayoutTenant() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    const ctx = resolveTenantByHost(host);
    if (ctx.isValid || ctx.isCore) return ctx;
  } catch {
    // static / capacitor fallback
  }
  return {
    tenant: PILOT_TENANT,
    isCore: false,
    isPilot: true,
    isValid: true,
    currentHost: PILOT_TENANT.primaryDomain,
    baseUrl: getSiteUrl(),
  };
}

export async function generateViewport(): Promise<Viewport> {
  const ctx = await resolveLayoutTenant();
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    viewportFit: "cover",
    themeColor: ctx.isCore ? "#020617" : "#047857",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await resolveLayoutTenant();
  const baseUrl = ctx.baseUrl || getSiteUrl();

  if (ctx.isCore) {
    return {
      metadataBase: new URL(baseUrl),
      title: {
        default: "O2W HERO — Platform SaaS Pengelolaan Sampah & Retribusi TPS3R",
        template: "%s | O2W HERO",
      },
      description:
        "Platform SaaS enterprise pengelolaan sampah, penagihan retribusi QRIS otomatis, aplikasi supir GPS, dan pelaporan ESG untuk TPS3R & pengelola sampah se-Indonesia.",
      alternates: { canonical: "/" },
      openGraph: {
        type: "website",
        locale: "id_ID",
        url: "/",
        siteName: "O2W HERO",
        title: "O2W HERO — Ekosistem SaaS Pengelolaan Sampah Digital",
        description:
          "Digitalisasi operasional pengangkutan sampah, penagihan QRIS otomatis, dan dashboard akuntansi multi-tenant.",
        images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "O2W HERO SaaS Platform" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "O2W HERO — SaaS Pengelolaan Sampah & Ekonomi Sirkular",
        description:
          "Digitalisasi operasional TPS3R, penagihan WhatsApp QRIS, dan tracking armada GPS.",
      },
      icons: {
        icon: "/images/o2w-logo.svg",
        apple: "/images/o2w-logo.svg",
      },
    };
  }

  const brandName = ctx.tenant.branding?.namaMitra || ctx.tenant.namaMitra || SITE_CONFIG.name;
  const brandCity = ctx.tenant.branding?.kota || "Indonesia";
  const brandLogo = ctx.tenant.branding?.logoUrl || "/ups-heru-logo.jpg";
  const defaultTitle = ctx.isPilot
    ? SITE_CONFIG.titleDefault
    : `${brandName} — Portal Pengelolaan & Retribusi Sampah ${brandCity}`;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: defaultTitle,
      template: ctx.isPilot ? SITE_CONFIG.titleTemplate : `%s | ${brandName}`,
    },
    description: ctx.isPilot ? SITE_CONFIG.description : ctx.tenant.branding?.tagline || SITE_CONFIG.description,
    keywords: ctx.isPilot ? SITE_CONFIG.keywords : ["pengelolaan sampah", "retribusi sampah", "QRIS", brandName],
    authors: [{ name: brandName, url: baseUrl }],
    creator: brandName,
    publisher: brandName,
    formatDetection: {
      telephone: true,
      address: true,
      email: false,
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "id_ID",
      url: "/",
      siteName: brandName,
      title: defaultTitle,
      description: ctx.isPilot ? SITE_CONFIG.description : ctx.tenant.branding?.tagline || SITE_CONFIG.description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: brandName }],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: ctx.isPilot ? SITE_CONFIG.description : ctx.tenant.branding?.tagline || SITE_CONFIG.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: "/favicon.ico",
      apple: brandLogo,
    },
    verification: ctx.isPilot
      ? { google: "6aINUXOB2lc27VvIC1CK-GOYNUfHE3Y-0Su9xg8gEtI" }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const ctx = await resolveLayoutTenant();

  return (
    <html
      lang="id"
      data-brand={ctx.isCore ? "o2whero" : "tenant"}
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var s = localStorage.getItem('wastepay-theme');
                var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (s === 'dark' || ((!s || s === 'system') && d)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 selection:bg-emerald-700 selection:text-white transition-colors duration-200">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2.5 focus:bg-emerald-700 focus:text-white focus:rounded-xl focus:font-bold focus:text-sm focus:shadow-lg focus:outline-none"
        >
          Langsung ke konten utama
        </a>
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
