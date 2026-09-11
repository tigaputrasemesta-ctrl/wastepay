import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pembayaran Tagihan Retribusi",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function BayarTagihanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
