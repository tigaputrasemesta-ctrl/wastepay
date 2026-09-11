"use client";

import { useEffect, useState } from "react";

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
    <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
      <span className="hidden md:inline text-slate-500">{tanggal}</span>
      <span className="flex items-center gap-2 bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 rounded-full text-slate-700 text-[11px] font-semibold tabular-nums shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        {waktu} WIB
      </span>
    </div>
  );
}
