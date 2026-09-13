"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type Thread = {
  petugasId: number;
  nama: string;
  jabatan: string | null;
  wilayah: string | null;
  pesanTerakhir: string;
  waktuTerakhir: string;
  unread: number;
};

type Pesan = {
  id: number;
  dariPetugas: boolean;
  isi: string;
  createdAt: string;
  pengirim: { nama: string; role: string };
};

export default function AdminChat() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [petugasId, setPetugasId] = useState<number | null>(null);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [isi, setIsi] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const muatThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/chat");
      const d = await res.json();
      if (Array.isArray(d)) setThreads(d);
    } catch {
      // poll berikutnya
    } finally {
      setLoading(false);
    }
  }, []);

  const muatPesan = useCallback(async (pid: number, tandaiBaca: boolean) => {
    try {
      const res = await fetch(`/api/chat?petugasId=${pid}`);
      const d = await res.json();
      if (res.ok) {
        setPesan(d.pesan ?? []);
        if (tandaiBaca) {
          fetch("/api/chat/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ petugasId: pid }),
          }).catch(() => {});
        }
      }
    } catch {
      // poll berikutnya
    }
  }, []);

  useEffect(() => {
    // initial load + poll: setState terjadi setelah await (async), bukan sinkron
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void muatThreads();
    const t = setInterval(() => {
      void muatThreads();
      if (petugasId != null) void muatPesan(petugasId, true);
    }, 5000);
    return () => clearInterval(t);
  }, [muatThreads, muatPesan, petugasId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (petugasId != null) void muatPesan(petugasId, true);
  }, [petugasId, muatPesan]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [pesan]);

  async function kirim() {
    if (petugasId == null) return;
    const t = isi.trim();
    if (!t || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petugasId, isi: t }),
      });
      const d = await res.json();
      if (res.ok) {
        setIsi("");
        setPesan((p) => [...p, d]);
        void muatThreads();
      } else {
        setError(d.error || "Gagal mengirim");
      }
    } catch {
      setError("Jaringan bermasalah");
    } finally {
      setSending(false);
    }
  }

  const threadTerpilih = threads.find((t) => t.petugasId === petugasId);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Chat Petugas Lapangan</h1>
          <p className="text-sm text-slate-500 font-medium">Pusat koordinasi langsung admin dan armada petugas di lapangan</p>
        </div>
        {threadTerpilih && (
          <span className="px-3.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-semibold inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {threadTerpilih.nama}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-[calc(100vh-230px)] min-h-[520px]">
        {/* Daftar thread */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Daftar Petugas
            </span>
            <span className="text-[11px] text-slate-400 font-medium">{threads.length} Petugas</span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">Memuat daftar petugas…</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium text-xs">Belum ada petugas aktif.</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.petugasId}
                  onClick={() => setPetugasId(t.petugasId)}
                  className={`w-full text-left px-4 py-3.5 flex items-start justify-between gap-3 transition-colors ${
                    petugasId === t.petugasId
                      ? "bg-emerald-50/80 border-l-4 border-emerald-600 text-slate-900"
                      : "hover:bg-slate-50/80 text-slate-700"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{t.nama}</p>
                      {t.waktuTerakhir && (
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {format(new Date(t.waktuTerakhir), "HH:mm")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {t.jabatan?.split(",").map((j) => j.trim()).join("/") || "Petugas Lapangan"}
                      {t.wilayah ? ` · ${t.wilayah}` : ""}
                    </p>
                    {t.pesanTerakhir && (
                      <p className="text-xs text-slate-600 truncate mt-1 font-medium">{t.pesanTerakhir}</p>
                    )}
                  </div>
                  {t.unread > 0 && (
                    <span className="shrink-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {t.unread}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Area chat */}
        <div className="md:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {petugasId == null ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50/30">
              <div className="max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3 shadow-sm">
                  💬
                </div>
                <p className="font-bold text-slate-800 text-base">Pilih Petugas</p>
                <p className="text-xs text-slate-500 mt-1">Pilih petugas di panel sebelah kiri untuk melihat riwayat atau mengirim pesan baru.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40">
                {error && (
                  <div className="p-3 text-center text-xs font-semibold rounded-xl text-rose-700 bg-rose-50 border border-rose-200">{error}</div>
                )}
                {pesan.length === 0 ? (
                  <div className="text-center text-xs font-medium text-slate-400 py-16">Belum ada pesan. Mulai percakapan sekarang.</div>
                ) : (
                  pesan.map((m) => (
                    <div key={m.id} className={`flex ${m.dariPetugas ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[75%] px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm ${
                          m.dariPetugas
                            ? "bg-white border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs"
                            : "bg-emerald-600 text-white rounded-2xl rounded-tr-xs"
                        }`}
                      >
                        <p className={`text-[10px] font-medium mb-1 ${m.dariPetugas ? "text-slate-400" : "text-emerald-100"}`}>
                          {m.pengirim.nama} · {format(new Date(m.createdAt), "d MMM, HH:mm", { locale: id })}
                        </p>
                        <div className="leading-relaxed">{m.isi}</div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2.5 p-3.5 bg-white border-t border-slate-200">
                <input
                  value={isi}
                  onChange={(e) => setIsi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && kirim()}
                  placeholder="Tulis pesan ke petugas…"
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                <button
                  onClick={kirim}
                  disabled={sending || !isi.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  {sending ? "Mengirim…" : "Kirim"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
