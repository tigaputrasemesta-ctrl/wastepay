import type { Metadata } from "next";
import AdminShell from "@/components/AdminShell";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Admin Panel | UPS HERU",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
