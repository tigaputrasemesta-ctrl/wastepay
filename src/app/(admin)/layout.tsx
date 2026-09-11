import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import NotificationBell from "@/components/NotificationBell";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Admin Panel | UPS HERU WastePay",
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
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Control Panel Operasional</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <StatusBar />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
