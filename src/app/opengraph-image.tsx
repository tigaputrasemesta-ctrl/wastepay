import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
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
        {/* Subtle grid pattern / top badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                border: "1px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              🚛
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "28px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
                UPS HERU <span style={{ color: "#34d399" }}>UPS HERU</span>
              </span>
              <span style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.75)" }}>
                Unit Pengelolaan Sampah 3R • Kota Depok
              </span>
            </div>
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
            Layanan Resmi Warga Depok 2026
          </div>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "950px" }}>
          <h1
            style={{
              fontSize: "56px",
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
            Jadwal penjemputan pasti, pelacakan armada truk sampah real-time,
            serta kemudahan pembayaran iuran via QRIS & Virtual Account.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.12)",
              padding: "10px 20px",
              borderRadius: "14px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            <span>📍</span> Pelacakan Truk Real-Time
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.12)",
              padding: "10px 20px",
              borderRadius: "14px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            <span>💳</span> Pembayaran Instan QRIS
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255, 255, 255, 0.12)",
              padding: "10px 20px",
              borderRadius: "14px",
              fontSize: "16px",
              fontWeight: "600",
            }}
          >
            <span>✨</span> Zero Waste City
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
