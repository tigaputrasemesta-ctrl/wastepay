import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import { ToastProvider } from "@/components/Toast";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-asphalt text-bone">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar ops */}
          <header className="h-14 flex items-center justify-between px-5 border-b border-asphalt-line bg-asphalt-deep">
            <div className="flex items-center gap-3">
              <span className="stencil text-bone-faint hidden sm:inline">
                Unit Pengelola Sampah
              </span>
              <span className="hidden sm:inline w-px h-4 bg-asphalt-line" />
              <span className="stencil text-vest">Sistem Operasi</span>
            </div>
            <StatusBar />
          </header>
          {/* Hazard strip */}
          <div className="hazard h-1.5 opacity-70" aria-hidden />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
