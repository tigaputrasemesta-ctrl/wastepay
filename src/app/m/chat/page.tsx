"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Pesan = {
  id: number;
  petugasId: number;
  dariPetugas: boolean;
  isi: string;
  dibaca: boolean;
  createdAt: string;
  pengirim: { nama: string; role: string };
};

export default function MobileChat() {
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [isi, setIsi] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const muat = useCallback(async (tandaiBaca: boolean) => {
    try {
      const res = await fetch("/api/chat");
      const d = await res.json();
      if (res.ok) {
        setPesan(d.pesan ?? []);
        if (tandaiBaca && (d.pesan ?? []).some((m: Pesan) => !m.dariPetugas && !m.dibaca)) {
          fetch("/api/chat/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }).catch(() => {});
        }
      } else {
        setError(d.error || "Gagal memuat chat");
      }
    } catch {
      setError("Jaringan bermasalah");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void muat(true);
    const t = setInterval(() => muat(true), 5000);
    return () => clearInterval(t);
  }, [muat]);

  useEffect(() => {
    if (pesan.length !== lastCountRef.current) {
      lastCountRef.current = pesan.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [pesan]);

  async function kirim() {
    const t = isi.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isi: t }),
      });
      const d = await res.json();
      if (res.ok) {
        setIsi("");
        setPesan((p) => [...p, d]);
      } else {
        setError(d.error || "Gagal mengirim");
      }
    } catch {
      setError("Jaringan bermasalah");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Compact Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            💬
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-bold text-slate-900 leading-tight truncate">
              Pesan ke Admin Dinas
            </h1>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Koordinasi armada & kendala</span>
            </div>
          </div>
        </div>
        <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Live
        </span>
      </div>

      {error && (
        <p className="mt-1 text-center text-[10px] font-semibold p-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 shrink-0">
          {error}
        </p>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2.5 space-y-2 pr-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pesan.length === 0 ? (
          <div className="text-center py-12 px-4">
            <span className="text-2xl block mb-1">💬</span>
            <p className="font-bold text-xs text-slate-700">Belum Ada Pesan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Kirim pesan untuk menghubungi dispatcher atau admin dinas.
            </p>
          </div>
        ) : (
          pesan.map((m) => (
            <div key={m.id} className={`flex ${m.dariPetugas ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2 text-xs shadow-2xs ${
                  m.dariPetugas
                    ? "bg-emerald-700 text-white rounded-2xl rounded-tr-xs"
                    : "bg-white border border-slate-200/90 text-slate-900 rounded-2xl rounded-tl-xs"
                }`}
              >
                <div
                  className={`text-[9px] font-semibold mb-0.5 flex items-center gap-1.5 ${
                    m.dariPetugas ? "text-emerald-200" : "text-slate-400"
                  }`}
                >
                  <span className="font-bold">{m.dariPetugas ? "Anda" : "Admin"}</span>
                  <span>•</span>
                  <span>{format(new Date(m.createdAt), "HH:mm", { locale: id })}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap break-words">{m.isi}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Pinned Input Bar */}
      <div className="pt-2 border-t border-slate-200/80 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            kirim();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder="Tulis pesan ke admin…"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
          />
          <button
            type="submit"
            disabled={sending || !isi.trim()}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition-all disabled:opacity-40 shrink-0"
          >
            {sending ? "…" : "Kirim"}
          </button>
        </form>
      </div>
    </div>
  );
}
