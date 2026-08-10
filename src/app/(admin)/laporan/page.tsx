import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

async function getLaporan(bulanIni: number, tahunIni: number) {
  const awalBulan = new Date(tahunIni, bulanIni - 1, 1);
  const akhirBulan = new Date(tahunIni, bulanIni, 1);

  // Pendapatan bulan ini
  const pemasukanBulanIni = await prisma.pembayaran.aggregate({
    where: {
      status: "terverifikasi",
      createdAt: { gte: awalBulan, lt: akhirBulan },
    },
    _sum: { jumlah: true },
  });

  // Pengeluaran bulan ini
  const pengeluaranBulanIni = await prisma.pengeluaran.aggregate({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
    },
    _sum: { jumlah: true },
  });

  // Total tagihan bulan ini
  const totalTagihanBulanIni = await prisma.tagihan.aggregate({
    where: { bulan: bulanIni, tahun: tahunIni },
    _sum: { jumlah: true },
  });

  // Tagihan lunas bulan ini
  const tagihanLunas = await prisma.tagihan.aggregate({
    where: { bulan: bulanIni, tahun: tahunIni, status: "lunas" },
    _sum: { jumlah: true },
  });

  // Data per kategori pengeluaran
  const pengeluaranByKategori = await prisma.pengeluaran.groupBy({
    by: ["kategori"],
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
    },
    _sum: { jumlah: true },
  });

  // Volume sampah bulan ini
  const volumeAgg = await prisma.pengangkutan.aggregate({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
    },
    _sum: { volume: true, berat: true },
  });

  // Sampah per jenis
  const sampahByJenis = await prisma.pengangkutan.groupBy({
    by: ["jenisSampah"],
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
      jenisSampah: { not: null },
    },
    _sum: { volume: true, berat: true },
    _count: true,
  });

  // Sampah per TPA
  const sampahByTpa = await prisma.pengangkutan.groupBy({
    by: ["tpaId"],
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
      tpaId: { not: null },
    },
    _sum: { volume: true, berat: true },
    _count: true,
  });

  // Get TPA names
  const tpaIds = sampahByTpa.map((s) => s.tpaId).filter(Boolean) as number[];
  const tpaList = tpaIds.length > 0
    ? await prisma.tpa.findMany({
        where: { id: { in: tpaIds } },
        select: { id: true, nama: true },
      })
    : [];

  // Data pelanggan menunggak
  const tagihanMenunggak = await prisma.tagihan.findMany({
    where: {
      status: "belum_bayar",
      OR: [
        { tahun: { lt: tahunIni } },
        { tahun: tahunIni, bulan: { lt: bulanIni } },
      ],
    },
    include: {
      pelanggan: { select: { id: true, nama: true, noTelepon: true, alamat: true } },
    },
    orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
    take: 50,
  });

  const totalPelanggan = await prisma.pelanggan.count({ where: { status: "aktif" } });
  const totalBelumBayar = await prisma.tagihan.count({
    where: { bulan: bulanIni, tahun: tahunIni, status: "belum_bayar" },
  });

  // Total pengangkutan
  const totalPengangkutan = await prisma.pengangkutan.count({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
    },
  });

  const totalDiambil = await prisma.pengangkutan.count({
    where: {
      tanggal: { gte: awalBulan, lt: akhirBulan },
      status: "diambil",
    },
  });

  const totalPemasukan = pemasukanBulanIni._sum.jumlah || 0;
  const totalPengeluaran = pengeluaranBulanIni._sum.jumlah || 0;

  return {
    bulanIni,
    tahunIni,
    totalPemasukan,
    totalPengeluaran,
    saldo: totalPemasukan - totalPengeluaran,
    totalTagihan: totalTagihanBulanIni._sum.jumlah || 0,
    tagihanTerkumpul: tagihanLunas._sum.jumlah || 0,
    tagihanSisa: (totalTagihanBulanIni._sum.jumlah || 0) - (tagihanLunas._sum.jumlah || 0),
    pengeluaranByKategori,
    tagihanMenunggak,
    totalPelanggan,
    totalBelumBayar,
    // Environmental data
    totalVolume: volumeAgg._sum.volume || 0,
    totalBerat: volumeAgg._sum.berat || 0,
    sampahByJenis,
    sampahByTpa: sampahByTpa.map((s) => ({
      tpaId: s.tpaId,
      nama: tpaList.find((t) => t.id === s.tpaId)?.nama || `TPA #${s.tpaId}`,
      volume: s._sum.volume || 0,
      berat: s._sum.berat || 0,
      count: s._count,
    })),
    totalPengangkutan,
    totalDiambil,
  };
}

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
            <h1 className="font-black uppercase tracking-tighter text-2xl text-black font-black">Laporan Keuangan & Operasional</h1>
            <p className="text-sm text-gray-600 font-bold mt-1">
              Ringkasan {NAMA_BULAN[bulan - 1]} {tahun}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <form method="GET" className="flex items-center gap-2">
              <select
                name="bulan"
                defaultValue={bulan}
                className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {NAMA_BULAN.map((b, i) => (
                  <option key={i + 1} value={i + 1}>{b}</option>
                ))}
              </select>
              <select
                name="tahun"
                defaultValue={tahun}
                className="px-3 py-2 border-2 border-black rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                {[2024, 2025, 2026, 2027, 2028].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:-translate-y-1 transition-all bg-green-400 hover:bg-green-300 text-black rounded-none text-sm font-medium transition"
              >
                Tampilkan
              </button>
            </form>
            <a
              href={`/api/laporan/export?bulan=${bulan}&tahun=${tahun}`}
              className="px-4 py-2 border border-vest text-green-600 hover:bg-green-400/5 rounded-none text-sm font-medium transition"
            >
              ⬇ Ekspor CSV
            </a>
          </div>
        </div>
      </div>

      {/* Ringkasan Keuangan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="hm-card bg-white p-0 overflow-hidden p-5">
          <p className="text-sm text-gray-600 font-bold mb-1">Pemasukan</p>
          <p className="text-2xl font-bold text-green-600">{formatRupiah(data.totalPemasukan)}</p>
        </div>
        <div className="hm-card bg-white p-0 overflow-hidden p-5">
          <p className="text-sm text-gray-600 font-bold mb-1">Pengeluaran</p>
          <p className="text-2xl font-bold text-red-600">{formatRupiah(data.totalPengeluaran)}</p>
        </div>
        <div className="hm-card bg-white p-0 overflow-hidden p-5">
          <p className="text-sm text-gray-600 font-bold mb-1">Saldo Bersih</p>
          <p className={`text-2xl font-bold ${data.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatRupiah(data.saldo)}
          </p>
        </div>
        <div className="hm-card bg-white p-0 overflow-hidden p-5">
          <p className="text-sm text-gray-600 font-bold mb-1">Efektivitas Tagihan</p>
          <p className="text-2xl font-bold text-green-600">
            {data.totalTagihan > 0
              ? Math.round((data.tagihanTerkumpul / data.totalTagihan) * 100)
              : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tagihan */}
        <div className="hm-card bg-white p-0 overflow-hidden p-5">
          <h2 className="font-semibold text-black font-black mb-4">Tagihan Bulan Ini</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-bold">Total Tagihan</span>
              <span className="font-semibold">{formatRupiah(data.totalTagihan)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-bold">Terkumpul</span>
              <span className="font-semibold text-green-600">{formatRupiah(data.tagihanTerkumpul)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-bold">Sisa Tagihan</span>
              <span className="font-semibold text-red-600">{formatRupiah(data.tagihanSisa)}</span>
            </div>
            <div className="border-t pt-3 flex justify-between items-center text-sm">
              <span className="text-gray-600 font-bold">Pelanggan Aktif</span>
              <span className="font-semibold">{data.totalPelanggan}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-bold">Belum Bayar</span>
              <span className="font-semibold text-amber">{data.totalBelumBayar}</span>
            </div>
          </div>
        </div>

        {/* Pengeluaran */}
        <div className="hm-card bg-white p-0 overflow-hidden p-5">
          <h2 className="font-semibold text-black font-black mb-4">Pengeluaran per Kategori</h2>
          {data.pengeluaranByKategori.length === 0 ? (
            <p className="text-sm text-gray-400 font-bold">Belum ada pengeluaran bulan ini</p>
          ) : (
            <div className="space-y-3">
              {data.pengeluaranByKategori.map((k) => (
                <div key={k.kategori} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-bold capitalize">
                    {k.kategori === "bbm" ? "BBM" :
                     k.kategori === "gaji_petugas" ? "Gaji Petugas" :
                     k.kategori === "perawatan" ? "Perawatan" :
                     k.kategori === "operasional" ? "Operasional" : "Lainnya"}
                  </span>
                  <span className="font-semibold text-red-600">{formatRupiah(k._sum.jumlah || 0)}</span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between items-center text-sm font-medium">
                <span>Total</span>
                <span className="text-red-600">{formatRupiah(data.totalPengeluaran)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Lingkungan */}
      <div className="mb-8">
        <h2 className="font-black uppercase tracking-tighter text-xl text-black font-black mb-4">🌱 Data Lingkungan</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="hm-card bg-white p-0 overflow-hidden p-5">
            <p className="text-sm text-gray-600 font-bold mb-1">Total Volume Sampah</p>
            <p className="font-black uppercase tracking-tighter text-2xl text-black font-black">{data.totalVolume.toFixed(1)} m³</p>
          </div>
          <div className="hm-card bg-white p-0 overflow-hidden p-5">
            <p className="text-sm text-gray-600 font-bold mb-1">Total Berat Sampah</p>
            <p className="font-black uppercase tracking-tighter text-2xl text-black font-black">{data.totalBerat.toFixed(1)} kg</p>
          </div>
          <div className="hm-card bg-white p-0 overflow-hidden p-5">
            <p className="text-sm text-gray-600 font-bold mb-1">Total Pengangkutan</p>
            <p className="font-black uppercase tracking-tighter text-2xl text-black font-black">{data.totalPengangkutan}</p>
          </div>
          <div className="hm-card bg-white p-0 overflow-hidden p-5">
            <p className="text-sm text-gray-600 font-bold mb-1">Berhasil Diangkut</p>
            <p className="text-2xl font-bold text-green-600">{data.totalDiambil}</p>
          </div>
        </div>

        {/* Sampah per Jenis */}
        {data.sampahByJenis.length > 0 && (
          <div className="hm-card bg-white p-0 overflow-hidden p-5 mb-4">
            <h3 className="font-semibold text-black font-black mb-3">Sampah per Jenis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.sampahByJenis.map((j) => (
                <div key={j.jenisSampah} className="bg-black text-white font-black rounded-none p-3">
                  <p className="text-sm font-medium text-black font-black capitalize">{j.jenisSampah}</p>
                  <p className="text-xs text-gray-600 font-bold mt-1">
                    Volume: {j._sum.volume?.toFixed(1)} m³ | Berat: {j._sum.berat?.toFixed(1)} kg
                  </p>
                  <p className="text-xs text-gray-400 font-bold">{j._count} kali angkut</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sampah per TPA */}
        {data.sampahByTpa.length > 0 && (
          <div className="hm-card bg-white p-0 overflow-hidden p-5">
            <h3 className="font-semibold text-black font-black mb-3">Pembuangan per TPA</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-black text-white font-black border-b border-2 border-black">
                    <th className="text-left px-3 py-2 font-medium text-gray-600 font-bold">TPA</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 font-bold">Volume (m³)</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 font-bold">Berat (kg)</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 font-bold">Frekuensi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sampahByTpa.map((s) => (
                    <tr key={s.tpaId} className="border-b border-2 border-black">
                      <td className="px-3 py-2 font-medium text-black font-black">{s.nama}</td>
                      <td className="px-3 py-2 text-right">{s.volume.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{s.berat.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Tagihan Menunggak */}
      <div className="hm-card bg-white p-0 overflow-hidden p-5">
        <h2 className="font-semibold text-black font-black mb-4">Tagihan Menunggak</h2>
        {data.tagihanMenunggak.length === 0 ? (
          <p className="text-sm text-gray-400 font-bold">Tidak ada tagihan menunggak</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black text-white font-black border-b border-2 border-black">
                  <th className="text-left px-3 py-2 font-medium text-gray-600 font-bold">Pelanggan</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 font-bold">No. Telepon</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 font-bold">Periode</th>
                  <th className="text-right px-3 py-2 font-medium text-gray-600 font-bold">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {data.tagihanMenunggak.map((t) => (
                  <tr key={t.id} className="border-b border-2 border-black">
                    <td className="px-3 py-2 font-medium text-black font-black">{t.pelanggan.nama}</td>
                    <td className="px-3 py-2 text-gray-600 font-bold">{t.pelanggan.noTelepon}</td>
                    <td className="px-3 py-2 text-gray-600 font-bold">{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"][t.bulan - 1]} {t.tahun}</td>
                    <td className="px-3 py-2 text-right text-red-600 font-medium">{formatRupiah(t.jumlah)}</td>
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
