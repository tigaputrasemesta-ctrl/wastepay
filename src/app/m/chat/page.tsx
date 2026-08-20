"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export const dynamic = "force-dynamic";

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
        <h1 className="text-2xl font-black uppercase tracking-tighter">Chat Admin</h1>
        <p className="text-xs font-bold text-gray-500">Konsultasi & laporan ke admin</p>
      </div>

      {error && (
        <p className="text-center text-xs font-black p-2 border-2 border-red-600 text-red-700 bg-red-50">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] p-3 space-y-2">
        {loading ? (
          <p className="font-mono font-bold text-gray-500 text-center py-10">MEMUAT…</p>
        ) : pesan.length === 0 ? (
          <div className="text-center py-10">
            <p className="font-black uppercase">Belum ada pesan</p>
            <p className="text-xs font-bold text-gray-500 mt-1">Kirim pesan pertama ke admin.</p>
          </div>
        ) : (
          pesan.map((m) => (
            <div key={m.id} className={`flex ${m.dariPetugas ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] px-3 py-2 border-2 border-black text-sm font-bold whitespace-pre-wrap break-words ${
                  m.dariPetugas ? "bg-black text-white" : "bg-amber-50 text-black"
                }`}
              >
                <p className="text-[10px] font-mono font-bold opacity-60 mb-0.5">
                  {m.dariPetugas ? "Anda" : "Admin"} · {format(new Date(m.createdAt), "HH:mm", { locale: id })}
                </p>
                {m.isi}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && kirim()}
          placeholder="Tulis pesan…"
          className="flex-1 px-3 py-3 border-2 border-black text-sm font-bold outline-none bg-white"
        />
        <button
          onClick={kirim}
          disabled={sending || !isi.trim()}
          className="px-5 bg-black text-white border-2 border-black text-sm font-black uppercase tracking-widest active:translate-y-[2px] disabled:opacity-40"
        >
          {sending ? "…" : "Kirim"}
        </button>
      </div>
    </div>
  );
}
