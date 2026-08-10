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
    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-black">
      <span className="hidden md:inline">{tanggal}</span>
      <span className="flex items-center gap-2 bg-yellow-300 px-2 py-1 border-2 border-black">
        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse border border-black" />
        {waktu} WIB
      </span>
    </div>
  );
}
