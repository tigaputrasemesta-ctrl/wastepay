import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { ToastProvider } from "@/components/Toast";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin Panel | UPS HERU",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
