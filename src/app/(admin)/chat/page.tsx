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
    <div>
      <div className="flex items-end justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat Petugas</h1>
          <p className="text-xs font-bold text-gray-500">Komunikasi admin ↔ petugas lapangan</p>
        </div>
        {threadTerpilih && (
          <span className="px-3 py-1.5 border border-slate-200/80 bg-black text-white text-[11px] font-black uppercase">
            {threadTerpilih.nama}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[70vh]">
        {/* Daftar thread */}
        <div className="bg-white border border-slate-200/80 shadow-sm overflow-y-auto">
          <p className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-slate-200 bg-[#f4f4f0] sticky top-0">
            Petugas
          </p>
          {loading ? (
            <p className="p-4 font-mono font-bold text-gray-500 text-sm">MEMUAT…</p>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm font-bold text-gray-500">Belum ada petugas aktif.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.petugasId}
                onClick={() => setPetugasId(t.petugasId)}
                className={`w-full text-left px-3 py-2.5 border-b border-gray-200 flex items-start justify-between gap-2 ${
                  petugasId === t.petugasId ? "bg-black text-white" : "hover:bg-gray-50"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase truncate">{t.nama}</p>
                  <p className="text-[10px] font-bold opacity-70 truncate">
                    {t.jabatan?.split(",").map((j) => j.trim().toUpperCase()).join("/") || "PETUGAS"}
                    {t.wilayah ? ` · ${t.wilayah}` : ""}
                  </p>
                  {t.pesanTerakhir && (
                    <p className="text-[11px] font-bold opacity-80 truncate">{t.pesanTerakhir}</p>
                  )}
                </div>
                {t.unread > 0 && (
                  <span className="shrink-0 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {t.unread}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Area chat */}
        <div className="md:col-span-2 flex flex-col bg-white border border-slate-200/80 shadow-sm">
          {petugasId == null ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <p className="font-black uppercase tracking-tight">Pilih petugas</p>
                <p className="text-xs font-bold text-gray-500 mt-1">Klik nama petugas di daftar untuk mulai chat.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {error && (
                  <p className="text-center text-xs font-black p-2 border-2 border-red-600 text-red-700 bg-red-50">{error}</p>
                )}
                {pesan.length === 0 ? (
                  <p className="text-center text-sm font-bold text-gray-500 py-10">Belum ada pesan. Mulai percakapan.</p>
                ) : (
                  pesan.map((m) => (
                    <div key={m.id} className={`flex ${m.dariPetugas ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[75%] px-3 py-2 border border-slate-200/80 text-sm font-bold whitespace-pre-wrap break-words ${
                          m.dariPetugas ? "bg-amber-50 text-black" : "bg-black text-white"
                        }`}
                      >
                        <p className="text-[10px] font-mono font-bold opacity-60 mb-0.5">
                          {m.pengirim.nama} · {format(new Date(m.createdAt), "d MMM, HH:mm", { locale: id })}
                        </p>
                        {m.isi}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 p-3 border-t border-slate-200">
                <input
                  value={isi}
                  onChange={(e) => setIsi(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && kirim()}
                  placeholder="Tulis pesan ke petugas…"
                  className="flex-1 px-3 py-2.5 border border-slate-200/80 text-sm font-bold outline-none"
                />
                <button
                  onClick={kirim}
                  disabled={sending || !isi.trim()}
                  className="px-5 bg-black text-white border border-slate-200/80 text-sm font-black uppercase tracking-widest active:translate-y-[2px] disabled:opacity-40"
                >
                  {sending ? "…" : "Kirim"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
