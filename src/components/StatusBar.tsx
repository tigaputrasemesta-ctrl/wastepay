"use client";

import { useEffect, useState } from "react";

/** Jam live + tanggal — gaya terminal ops. */
export default function StatusBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const waktu = now
    ? now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "··:··:··";
  const tanggal = now
    ? now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
      <span className="hidden md:inline">{tanggal}</span>
      <span className="hidden md:inline w-px h-4 bg-[var(--neon-cyan)]/30" />
      <span className="flex items-center gap-2 text-[var(--neon-lime)]">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-lime)] animate-pulse shadow-[0_0_5px_var(--neon-lime)]" />
        {waktu} WIB
      </span>
    </div>
  );
}
