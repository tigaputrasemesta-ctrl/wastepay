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
      <div className="flex h-screen bg-[#f4f4f0] text-black">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between px-5 bg-white border-b-2 border-black">
            <div className="flex items-center gap-3 font-bold text-xs uppercase tracking-widest">
              <span className="hidden sm:inline bg-black text-white px-2 py-1 font-black shadow-[2px_2px_0_0_#10b981]">
                UPS HERU ADMIN
              </span>
              <span className="hidden sm:inline">CONTROL PANEL</span>
            </div>
            <StatusBar />
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
