"use client";

import AdminMobileResponsiveShell from "@/components/admin/AdminMobileResponsiveShell";

export default function AdminShell({
  children,
  renderMapSlot,
}: {
  children: React.ReactNode;
  renderMapSlot?: React.ReactNode;
}) {
  return (
    <AdminMobileResponsiveShell renderMapSlot={renderMapSlot}>
      {children}
    </AdminMobileResponsiveShell>
  );
}
