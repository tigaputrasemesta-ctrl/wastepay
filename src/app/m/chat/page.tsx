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
    // initial load + poll: setState terjadi setelah await (async), bukan sinkron
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="flex flex-col space-y-3" style={{ height: "calc(100vh - 130px)" }}>
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Komunikasi Langsung Lapangan
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pesan ke Admin</h1>
        <p className="text-xs font-medium text-slate-500">Koordinasi rute, kendala armada & bantuan operasional</p>
      </div>

      {error && (
        <p className="text-center text-xs font-semibold p-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto bg-slate-50/70 rounded-3xl border border-slate-200/90 p-4 space-y-3 shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pesan.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-2xl block mb-2">💬</span>
            <p className="font-bold text-sm text-slate-700">Belum Ada Riwayat Pesan</p>
            <p className="text-xs text-slate-400 mt-1">Ketik pesan pertama Anda untuk menghubungi admin dinas.</p>
          </div>
        ) : (
          pesan.map((m) => (
            <div key={m.id} className={`flex ${m.dariPetugas ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] px-4 py-2.5 text-sm shadow-xs ${
                  m.dariPetugas
                    ? "bg-emerald-600 text-white rounded-2xl rounded-tr-xs"
                    : "bg-white border border-slate-200/80 text-slate-900 rounded-2xl rounded-tl-xs"
                }`}
              >
                <div className={`text-[10px] font-medium mb-1 flex items-center gap-1.5 ${m.dariPetugas ? "text-emerald-100" : "text-slate-400"}`}>
                  <span className="font-bold">{m.dariPetugas ? "Anda" : "Admin Dinas"}</span>
                  <span>·</span>
                  <span>{format(new Date(m.createdAt), "HH:mm", { locale: id })}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap break-words">{m.isi}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-1">
        <input
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && kirim()}
          placeholder="Tulis pesan ke admin…"
          className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm font-medium outline-none bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-xs"
        />
        <button
          onClick={kirim}
          disabled={sending || !isi.trim()}
          className="px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-sm font-bold shadow-xs transition-all disabled:opacity-40"
        >
          {sending ? "…" : "Kirim"}
        </button>
      </div>
    </div>
  );
}
