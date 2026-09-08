import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TPS HERU - Sistem Pengelolaan Sampah Depok",
  description: "Layanan pengelolaan dan retribusi sampah terpadu untuk warga dan pelaku usaha Kota Depok",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${outfit.variable} ${jakarta.variable} ${jetbrains.variable} h-full antialiased bg-white`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-black selection:bg-red-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
