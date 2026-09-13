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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">
            {isAdmin ? "Kontrol Klaim Dana Operasional" : "Klaim Dana Lapangan"}
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            {isAdmin ? "Persetujuan dan audit reimbursement pengeluaran armada lapangan" : "Formulir pengajuan penggantian dana BBM, servis, dan operasional"}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Form Pengajuan Klaim (Hanya untuk Petugas) */}
      {!isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="border-b border-slate-200 pb-3 mb-5">
            <h2 className="text-base font-bold text-slate-900">Buat Pengajuan Baru</h2>
            <p className="text-xs text-slate-500">Lengkapi data klaim operasional armada</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kategori Pengeluaran</label>
              <select 
                value={kategori} onChange={(e) => setKategori(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              >
                <option value="bbm">Bahan Bakar (BBM)</option>
                <option value="perawatan">Perawatan / Bengkel / Tambal Ban</option>
                <option value="gaji_petugas">Kasbon / Absensi</option>
                <option value="lainnya">Lain-lain</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nominal (Rp)</label>
              <input 
                type="number" required
                value={nominal} onChange={(e) => setNominal(e.target.value)}
                placeholder="Contoh: 50000"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Keterangan / Rincian</label>
              <textarea 
                required
                value={keterangan} onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Tuliskan rincian pengeluaran secara lengkap..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[90px]"
              />
            </div>

            <button
              type="submit" disabled={submitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {submitting ? "Mengirim pengajuan..." : "Kirim Pengajuan Sekarang"}
            </button>
          </div>
        </form>
      )}

      {/* Daftar Klaim */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              {isAdmin ? "Menunggu Persetujuan & Riwayat Klaim" : "Riwayat Pengajuan Saya"}
            </h2>
            <p className="text-xs text-slate-500">Daftar klaim yang masuk beserta status audit</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">{data.length} Entri</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-medium text-xs">Memuat data klaim...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                  {isAdmin && <th className="px-5 py-3.5">Petugas</th>}
                  <th className="px-5 py-3.5">Tanggal</th>
                  <th className="px-5 py-3.5">Kategori</th>
                  <th className="px-5 py-3.5">Keterangan</th>
                  <th className="px-5 py-3.5">Nominal</th>
                  <th className="px-5 py-3.5">Status</th>
                  {isAdmin && <th className="px-5 py-3.5 text-center">Aksi (Kontrol)</th>}
                  <th className="px-5 py-3.5 text-center">Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 6} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                      Belum ada data klaim
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                      {isAdmin && <td className="px-5 py-3.5 font-semibold text-slate-900">{row.petugas.nama}</td>}
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {format(new Date(row.tanggal), "dd MMM yyyy", { locale: id })}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-slate-700">{row.kategori.replace("_", " ")}</td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[200px]">
                        <div>{row.keterangan}</div>
                        {row.catatanAdmin && (
                          <div className="mt-1 text-xs text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                            Pesan Admin: {row.catatanAdmin}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        Rp {row.nominal.toLocaleString("id-ID")}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] inline-block capitalize ${
                          row.status === 'disetujui' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 
                          row.status === 'ditolak' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3.5 text-center">
                          {row.status === "menunggu" ? (
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => handleProses(row.id, "disetujui")}
                                disabled={processingId === row.id}
                                className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 shadow-sm transition-all text-xs"
                              >
                                Terima
                              </button>
                              <button 
                                onClick={() => handleProses(row.id, "ditolak")}
                                disabled={processingId === row.id}
                                className="px-2.5 py-1 bg-rose-50 text-rose-600 font-semibold rounded-lg hover:bg-rose-100 transition-all text-xs"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">
                              {row.diperiksaBy ? `Oleh: ${row.diperiksaBy.nama}` : "-"}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-5 py-3.5 text-center">
                        <Link
                          href={`/klaim-cetak/${row.id}`}
                          target="_blank"
                          className="text-emerald-600 hover:text-emerald-700 font-semibold text-xs transition-colors"
                        >
                          Cetak ↗
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
