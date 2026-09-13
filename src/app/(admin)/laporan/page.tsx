import { getLaporan } from "@/lib/laporan";
import { formatRupiah } from "@/lib/utils";

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const bulan = Math.min(12, Math.max(1, parseInt(params.bulan || String(now.getMonth() + 1)) || now.getMonth() + 1));
  const tahun = parseInt(params.tahun || String(now.getFullYear())) || now.getFullYear();
  const data = await getLaporan(bulan, tahun);
  const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Laporan Keuangan & Operasional</h1>
            <p className="text-sm text-slate-500 font-medium">
              Ringkasan {NAMA_BULAN[bulan - 1]} {tahun}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <form method="GET" className="flex items-center gap-2">
              <select
                name="bulan"
                defaultValue={bulan}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {NAMA_BULAN.map((b, i) => (
                  <option key={i + 1} value={i + 1}>{b}</option>
                ))}
              </select>
              <select
                name="tahun"
                defaultValue={tahun}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {[2024, 2025, 2026, 2027, 2028].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all"
              >
                Tampilkan
              </button>
            </form>
            <a
              href={`/laporan-cetak?bulan=${bulan}&tahun=${tahun}`}
              target="_blank"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>🖨</span>
              <span>Cetak PDF</span>
            </a>
            <a
              href={`/api/laporan/export?bulan=${bulan}&tahun=${tahun}`}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <span>⬇</span>
              <span>Ekspor CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* Ringkasan Keuangan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-1">Pemasukan</p>
          <p className="text-2xl font-bold text-emerald-600">{formatRupiah(data.totalPemasukan)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-1">Pengeluaran</p>
          <p className="text-2xl font-bold text-rose-600">{formatRupiah(data.totalPengeluaran)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-1">Saldo Bersih</p>
          <p className={`text-2xl font-bold ${data.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {formatRupiah(data.saldo)}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 mb-1">Efektivitas Tagihan</p>
          <p className="text-2xl font-bold text-emerald-600">
            {data.totalTagihan > 0
              ? Math.round((data.tagihanTerkumpul / data.totalTagihan) * 100)
              : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tagihan */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 text-base mb-4">Tagihan Bulan Ini</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Total Tagihan</span>
              <span className="font-semibold text-slate-900">{formatRupiah(data.totalTagihan)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Terkumpul</span>
              <span className="font-semibold text-emerald-600">{formatRupiah(data.tagihanTerkumpul)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Sisa Tagihan</span>
              <span className="font-semibold text-rose-600">{formatRupiah(data.tagihanSisa)}</span>
            </div>
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Pelanggan Aktif</span>
              <span className="font-semibold text-slate-900">{data.totalPelanggan}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Belum Bayar</span>
              <span className="font-semibold text-amber-600">{data.totalBelumBayar}</span>
            </div>
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h2 className="font-bold text-slate-900 text-base mb-4">Pengeluaran per Kategori</h2>
          {data.pengeluaranByKategori.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium">Belum ada pengeluaran bulan ini</p>
          ) : (
            <div className="space-y-3">
              {data.pengeluaranByKategori.map((k) => (
                <div key={k.kategori} className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium capitalize">
                    {k.kategori === "bbm" ? "BBM" :
                     k.kategori === "gaji_petugas" ? "Gaji Petugas" :
                     k.kategori === "perawatan" ? "Perawatan" :
                     k.kategori === "operasional" ? "Operasional" : "Lainnya"}
                  </span>
                  <span className="font-semibold text-rose-600">{formatRupiah(k._sum.jumlah || 0)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm font-semibold text-slate-900">
                <span>Total</span>
                <span className="text-rose-600">{formatRupiah(data.totalPengeluaran)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Lingkungan */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-4">🌱 Data Lingkungan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Volume Sampah</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.totalVolume.toFixed(1)} m³</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Berat Sampah</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.totalBerat.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-1">Total Pengangkutan</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{data.totalPengangkutan}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 mb-1">Berhasil Diangkut</p>
            <p className="text-2xl font-bold text-emerald-600">{data.totalDiambil}</p>
          </div>
        </div>

        {/* Sampah per Jenis */}
        {data.sampahByJenis.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 mb-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-3">Sampah per Jenis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.sampahByJenis.map((j) => (
                <div key={j.jenisSampah} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-slate-900 capitalize">{j.jenisSampah}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Volume: {j._sum.volume?.toFixed(1)} m³ | Berat: {j._sum.berat?.toFixed(1)} kg
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{j._count} kali angkut</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sampah per TPA */}
        {data.sampahByTpa.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-3">Pembuangan per TPA</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                    <th className="text-left px-3 py-2 font-semibold">TPA</th>
                    <th className="text-right px-3 py-2 font-semibold">Volume (m³)</th>
                    <th className="text-right px-3 py-2 font-semibold">Berat (kg)</th>
                    <th className="text-right px-3 py-2 font-semibold">Frekuensi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sampahByTpa.map((s) => (
                    <tr key={s.tpaId} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-medium text-slate-900">{s.nama}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums text-xs font-medium">{s.volume.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums text-xs font-medium">{s.berat.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 tabular-nums text-xs font-medium">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tagihan Menunggak */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900 text-base mb-4">Tagihan Menunggak</h2>
        {data.tagihanMenunggak.length === 0 ? (
          <p className="text-sm text-slate-400 font-medium">Tidak ada tagihan menunggak</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-semibold">Pelanggan</th>
                  <th className="text-left px-3 py-2 font-semibold">No. Telepon</th>
                  <th className="text-left px-3 py-2 font-semibold">Periode</th>
                  <th className="text-right px-3 py-2 font-semibold">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {data.tagihanMenunggak.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-medium text-slate-900">{t.pelanggan.nama}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{t.pelanggan.noTelepon}</td>
                    <td className="px-3 py-2.5 text-slate-600">{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][t.bulan - 1]} {t.tahun}</td>
                    <td className="px-3 py-2.5 text-right text-rose-600 font-bold tabular-nums">{formatRupiah(t.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
