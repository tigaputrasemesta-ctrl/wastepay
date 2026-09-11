import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cek Tagihan & Bayar Retribusi Sampah",
  description:
    "Cek tagihan iuran sampah bulanan warga dan tempat usaha Kota Depok secara online. Bayar mudah lewat transfer bank, QRIS, dan e-wallet.",
  alternates: {
    canonical: "/bayar",
  },
  openGraph: {
    title: "Cek Tagihan & Bayar Retribusi Sampah | UPS HERU Depok",
    description:
      "Cek status tagihan sampah Anda dan bayar langsung secara online dengan berbagai metode pembayaran digital.",
  },
};

export default function BayarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
