import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { resolveTenantByHost } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  let isCore = false;
  let brandName = "UPS HERU";
  let brandCity = "Kota Depok";

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "";
    const ctx = resolveTenantByHost(host);
    isCore = ctx.isCore;
    if (!ctx.isCore && ctx.isValid) {
      brandName = ctx.tenant.branding?.namaMitra || ctx.tenant.namaMitra || brandName;
      brandCity = ctx.tenant.branding?.kota || brandCity;
    }
  } catch {
    // static fallback
  }

  if (isCore) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 80px",
            background: "linear-gradient(135deg, #020617 0%, #0f172a 55%, #064e3b 100%)",
            color: "white",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "34px", fontWeight: "800", letterSpacing: "-0.8px" }}>
                O2W <span style={{ color: "#34d399" }}>HERO</span>
              </span>
              <span style={{ fontSize: "16px", color: "#94a3b8" }}>
                Enterprise SaaS Pengelolaan Sampah & Ekonomi Sirkular
              </span>
            </div>
            <div
              style={{
                background: "rgba(56, 189, 248, 0.16)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                borderRadius: "9999px",
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#7dd3fc",
              }}
            >
              Multi-Tenant SaaS Control Tower
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "960px" }}>
            <h1 style={{ fontSize: "54px", fontWeight: "800", lineHeight: 1.12, margin: 0 }}>
              Otomatiskan TPS3R, Retribusi QRIS & <span style={{ color: "#34d399" }}>Armada GPS</span>
            </h1>
            <p style={{ fontSize: "22px", color: "#cbd5e1", margin: 0, lineHeight: 1.4 }}>
              Satu ekosistem digital untuk TPS3R, Bank Sampah, BUMDes, dan Pemerintah Daerah.
            </p>
          </div>

          <div style={{ display: "flex", gap: "16px", fontSize: "16px", fontWeight: "600", color: "#e2e8f0" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 18px", borderRadius: "12px" }}>
              QRIS & VA Otomatis
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 18px", borderRadius: "12px" }}>
              Aplikasi Supir Offline
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 18px", borderRadius: "12px" }}>
              Audit Akuntansi & ESG
            </div>
          </div>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          background: "linear-gradient(135deg, #064e3b 0%, #065f46 45%, #047857 100%)",
          color: "white",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "30px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
              {brandName} <span style={{ color: "#34d399" }}>{brandCity}</span>
            </span>
            <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.78)" }}>
              Unit Pengelolaan & Retribusi Kebersihan • {brandCity}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(52, 211, 153, 0.2)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#6ee7b7",
            }}
          >
            Portal Layanan Resmi Warga
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "950px" }}>
          <h1
            style={{
              fontSize: "54px",
              fontWeight: "800",
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              margin: 0,
            }}
          >
            Pengelolaan Sampah Terpadu & <br />
            <span style={{ color: "#34d399" }}>Retribusi Digital Transparan</span>
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "rgba(255, 255, 255, 0.85)",
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Jadwal penjemputan pasti, pelaporan kebersihan cepat, dan pembayaran iuran mudah via QRIS & Virtual Account.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "16px", fontWeight: "600" }}>
          <div style={{ background: "rgba(255, 255, 255, 0.12)", padding: "10px 20px", borderRadius: "14px" }}>
            Jemput Rutin & Bulk
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.12)", padding: "10px 20px", borderRadius: "14px" }}>
            Pembayaran Instan QRIS
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.12)", padding: "10px 20px", borderRadius: "14px" }}>
            Ekonomi Sirkular
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
