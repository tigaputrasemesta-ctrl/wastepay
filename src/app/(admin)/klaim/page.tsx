"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type KlaimRecord = {
  id: number;
  petugas: { nama: string };
  tanggal: string;
  kategori: string;
  nominal: number;
  keterangan: string;
  fotoBukti: string | null;
  status: string;
  catatanAdmin: string | null;
  diperiksaBy: { nama: string } | null;
};

export default function KlaimPage() {
  const [data, setData] = useState<KlaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("petugas"); 
  
  // Form State
  const [kategori, setKategori] = useState("bbm");
  const [nominal, setNominal] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin Processing State
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      // Dapatkan session role dari /api/auth/me jika perlu, 
      // tapi kita bisa cek role dengan memanggil API sementara (atau bergantung dari API klaim yg error jika salah)
      const resSession = await fetch("/api/auth/me");
      const session = await resSession.json();
      if (session.user) setRole(session.user.role);

      const res = await fetch("/api/klaim");
      const json = await res.json();
      if (res.ok) {
        setData(json.klaim || []);
      }
    } catch {
      setError("Gagal mengambil data klaim.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Data fetch on mount: semua setState terjadi setelah await fetch (async),
    // bukan sinkron di body effect — rule ini false-positive untuk pola ini.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/klaim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kategori, nominal, keterangan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengirim klaim");
      
      setNominal("");
      setKeterangan("");
      fetchData();
      alert("Klaim berhasil dikirim!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim klaim");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProses = async (klaimId: number, status: "disetujui" | "ditolak") => {
    const catatan = prompt(`Masukkan catatan (opsional) untuk status ${status.toUpperCase()}:`);
    if (catatan === null) return; // cancelled

    setProcessingId(klaimId);
    try {
      const res = await fetch("/api/klaim", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: klaimId, status, catatanAdmin: catatan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memproses klaim");
      
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal memproses klaim");
    } finally {
      setProcessingId(null);
    }
  };

  const isAdmin = role === "admin" || role === "superadmin";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-4 border-black pb-4">
        <h1 className="text-4xl font-bold tracking-tight">
          {isAdmin ? "KONTROL KLAIM DANA" : "KLAIM DANA LAPANGAN"}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 border-4 border-red-600 p-4 font-bold uppercase text-sm">
          {error}
        </div>
      )}

      {/* Form Pengajuan Klaim (Hanya untuk Petugas) */}
      {!isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white border-4 border-black p-6 shadow-lg">
          <h2 className="text-xl font-black uppercase mb-4 border-b border-slate-200 pb-2">BUAT PENGAJUAN BARU</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Kategori</label>
              <select 
                value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-black appearance-none uppercase"
              >
                <option value="bbm">Bahan Bakar (BBM)</option>
                <option value="perawatan">Perawatan / Bengkel / Tambal Ban</option>
                <option value="gaji_petugas">Kasbon / Absensi</option>
                <option value="lainnya">Lain-lain</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Nominal (Rp)</label>
              <input 
                type="number" required
                value={nominal} onChange={(e) => setNominal(e.target.value)}
                placeholder="CONTOH: 50000"
                className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-black"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2">Keterangan / Rincian</label>
              <textarea 
                required
                value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tuliskan keterangan detail..."
                className="w-full bg-white hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-black min-h-[100px]"
              />
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full hm-btn-red"
            >
              {submitting ? "MENGIRIM..." : "KIRIM PENGAJUAN SEKARANG"}
            </button>
          </div>
        </form>
      )}

      {/* Daftar Klaim */}
      <div className="hm-card bg-white mt-8">
        <h2 className="text-2xl font-black uppercase mb-6 border-b border-slate-200 pb-2">
          {isAdmin ? "MENUNGGU PERSETUJUAN & RIWAYAT" : "RIWAYAT KLAIM SAYA"}
        </h2>
        
        {loading ? (
          <p className="font-bold uppercase animate-pulse">Memuat data...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black text-white uppercase text-sm">
                  {isAdmin && <th className="p-3 border border-slate-200/80">Petugas</th>}
                  <th className="p-3 border border-slate-200/80">Tanggal</th>
                  <th className="p-3 border border-slate-200/80">Kategori</th>
                  <th className="p-3 border border-slate-200/80">Keterangan</th>
                  <th className="p-3 border border-slate-200/80">Nominal</th>
                  <th className="p-3 border border-slate-200/80">Status</th>
                  {isAdmin && <th className="p-3 border border-slate-200/80">Aksi (Kontrol)</th>}
                  <th className="p-3 border border-slate-200/80">Slip</th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 6} className="p-4 border border-slate-200/80 text-center font-bold uppercase text-gray-500">
                      Belum ada data klaim
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 text-sm font-bold uppercase">
                      {isAdmin && <td className="p-3 border border-slate-200/80">{row.petugas.nama}</td>}
                      <td className="p-3 border border-slate-200/80">
                        {format(new Date(row.tanggal), "dd MMM yyyy", { locale: id })}
                      </td>
                      <td className="p-3 border border-slate-200/80">{row.kategori.replace("_", " ")}</td>
                      <td className="p-3 border border-slate-200/80">
                        {row.keterangan}
                        {row.catatanAdmin && (
                          <div className="mt-1 text-xs text-red-600 bg-red-50 p-1 border border-red-600">
                            Pesan Admin: {row.catatanAdmin}
                          </div>
                        )}
                      </td>
                      <td className="p-3 border border-slate-200/80 font-black text-red-600">
                        Rp {row.nominal.toLocaleString("id-ID")}
                      </td>
                      <td className="p-3 border border-slate-200/80">
                        <span className={`px-2 py-1 border border-slate-200/80 font-black text-[10px] ${
                          row.status === 'disetujui' ? 'bg-green-100 text-green-700' : 
                          row.status === 'ditolak' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3 border border-slate-200/80">
                          {row.status === "menunggu" ? (
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleProses(row.id, "disetujui")}
                                disabled={processingId === row.id}
                                className="px-3 py-1 bg-green-500 text-white font-black hover:bg-green-600 border border-slate-200/80 shadow-xs"
                              >
                                TERIMA
                              </button>
                              <button 
                                onClick={() => handleProses(row.id, "ditolak")}
                                disabled={processingId === row.id}
                                className="px-3 py-1 bg-red-500 text-white font-black hover:bg-red-600 border border-slate-200/80 shadow-xs"
                              >
                                TOLAK
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-gray-500">
                              Oleh: {row.diperiksaBy?.nama}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="p-3 border border-slate-200/80 text-center">
                        <Link
                          href={`/klaim-cetak/${row.id}`}
                          target="_blank"
                          className="text-green-600 underline font-bold text-xs hover:text-green-700"
                        >
                          CETAK
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
