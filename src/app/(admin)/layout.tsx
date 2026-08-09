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
      <div className="flex h-screen bg-black text-slate-300 relative z-10">
        <div className="scanline" />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Topbar ops */}
          <header className="h-14 flex items-center justify-between px-5 border-b border-[var(--neon-cyan)] bg-[rgba(0,243,255,0.02)] backdrop-blur-md shadow-[0_0_15px_rgba(0,243,255,0.1)]">
            <div className="flex items-center gap-3 font-mono text-xs uppercase font-bold tracking-widest">
              <span className="text-slate-500 hidden sm:inline">
                DEPOK_UPS
              </span>
              <span className="hidden sm:inline w-px h-4 bg-[var(--neon-cyan)]/30" />
              <span className="text-[var(--neon-cyan)] glitch-text">SISTEM_OPERASI</span>
            </div>
            <StatusBar />
          </header>
          {/* Neon strip */}
          <div className="h-[2px] w-full bg-[var(--neon-pink)] shadow-[0_0_10px_var(--neon-pink)] opacity-70" aria-hidden />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
