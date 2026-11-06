import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRupiah, formatDate } from "@/lib/utils";
import TombolCetak from "@/components/TombolCetak";

export const dynamic = "force-dynamic";

const BULAN_NAMES = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default async function RekapRtCetakPage({
  searchParams,
}: {
  searchParams: Promise<{
    bulan?: string;
    tahun?: string;
    kelurahanId?: string;
    zonaId?: string;
    rt?: string;
    status?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const bulan = parseInt(sp.bulan || String(now.getMonth() + 1));
  const tahun = parseInt(sp.tahun || String(now.getFullYear()));
  const kelurahanId = sp.kelurahanId ? parseInt(sp.kelurahanId) : undefined;
  const zonaId = sp.zonaId ? parseInt(sp.zonaId) : undefined;
  const rtFilter = sp.rt?.trim() || undefined;
  const statusFilter = sp.status || undefined;

  const where: any = {
    deletedAt: null,
    bulan,
    tahun,
    pelanggan: {
      deletedAt: null,
      status: "aktif",
    },
  };

  if (statusFilter && statusFilter !== "semua") {
    where.status = statusFilter;
  }

  if (kelurahanId) {
    where.pelanggan.kelurahanId = kelurahanId;
  }

  if (zonaId) {
    where.pelanggan.wilayah = { zonaId };
  }

  if (rtFilter) {
    where.pelanggan.rtRw = { contains: rtFilter, mode: "insensitive" };
  }

  const listTagihan = await prisma.tagihan.findMany({
    where,
    include: {
      pelanggan: {
        include: {
          kelurahan: true,
          wilayah: { include: { zona: true } },
        },
      },
      pembayaran: {
        where: { status: "terverifikasi" },
        take: 1,
        orderBy: { id: "desc" },
      },
    },
    orderBy: [
      { pelanggan: { rtRw: "asc" } },
      { pelanggan: { nama: "asc" } },
    ],
  });

  // Calculate totals
  const totalWarga = listTagihan.length;
  const totalTagihan = listTagihan.reduce((acc, t) => acc + t.jumlah, 0);
  const totalLunas = listTagihan.filter((t) => t.status === "lunas").reduce((acc, t) => acc + t.jumlah, 0);
  const totalBelum = totalTagihan - totalLunas;

  // Nama Wilayah Info
  const kelurahanNama = listTagihan[0]?.pelanggan.kelurahan?.nama || (kelurahanId ? `Kelurahan #${kelurahanId}` : "Semua Kelurahan");
  const zonaNama = listTagihan[0]?.pelanggan.wilayah?.zona?.nama || (zonaId ? `Zona #${zonaId}` : "-");

  return (
    <div className="bg-white min-h-screen text-black p-6 sm:p-10 font-sans print:p-0">
      {/* Tombol Aksi di Layar Browser */}
      <div className="mb-6 flex items-center justify-between print:hidden border-b pb-4">
        <div>
          <a href="/tagihan" className="text-xs font-bold text-emerald-800 hover:underline">
            ← Kembali ke Menu Tagihan
          </a>
          <h1 className="text-lg font-bold text-slate-900 mt-1">
            Format Rekap Lembar Penagihan RT
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <TombolCetak />
        </div>
      </div>

      {/* KOP Surat Resmi */}
      <div className="border-b-2 border-black pb-3 mb-4 text-center">
        <h2 className="text-lg font-black tracking-wider uppercase">
          PEMERINTAH KOTA DEPOK — DINAS LINGKUNGAN HIDUP
        </h2>
        <h3 className="text-sm font-bold tracking-wide uppercase">
          UPT PENGELOLAAN SAMPAH KOTA DEPOK (UPS HERU)
        </h3>
        <p className="text-[11px] text-gray-700">
          Layanan Penjemputan Sampah Terpadu &amp; Retribusi Kebersihan Lingkungan Warga
        </p>
      </div>

      {/* Identitas Lembar Rekap */}
      <div className="flex justify-between items-start text-xs mb-4 leading-relaxed">
        <div>
          <table className="text-xs">
            <tbody>
              <tr>
                <td className="font-bold pr-2">Periode Retribusi</td>
                <td>: {BULAN_NAMES[bulan]} {tahun}</td>
              </tr>
              <tr>
                <td className="font-bold pr-2">Kelurahan</td>
                <td>: {kelurahanNama}</td>
              </tr>
              <tr>
                <td className="font-bold pr-2">RT / RW</td>
                <td>: {rtFilter ? `RT ${rtFilter}` : "Seluruh RT"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="text-right">
          <table className="text-xs ml-auto">
            <tbody>
              <tr>
                <td className="font-bold pr-2">Zona Armada</td>
                <td>: {zonaNama}</td>
              </tr>
              <tr>
                <td className="font-bold pr-2">Total Warga</td>
                <td>: {totalWarga} KK</td>
              </tr>
              <tr>
                <td className="font-bold pr-2">Total Nominal</td>
                <td className="font-bold">: {formatRupiah(totalTagihan)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabel Utama Warga */}
      <table className="w-full border-collapse border border-black text-xs">
        <thead>
          <tr className="bg-gray-100 border-b border-black text-center font-bold">
            <th className="border border-black py-2 px-1 w-8">No</th>
            <th className="border border-black py-2 px-2 w-28">Kode Warga</th>
            <th className="border border-black py-2 px-3 text-left">Nama Kepala Keluarga</th>
            <th className="border border-black py-2 px-3 text-left">Alamat / No. Rumah</th>
            <th className="border border-black py-2 px-2 w-16">RT/RW</th>
            <th className="border border-black py-2 px-2 text-right w-24">Tarif (Rp)</th>
            <th className="border border-black py-2 px-2 w-24">Status</th>
            <th className="border border-black py-2 px-3 w-32">Paraf / TTD Warga</th>
          </tr>
        </thead>
        <tbody>
          {listTagihan.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center py-8 text-gray-500 font-medium">
                Tidak ada data tagihan untuk filter yang dipilih.
              </td>
            </tr>
          ) : (
            listTagihan.map((t, idx) => {
              const isLunas = t.status === "lunas";
              return (
                <tr key={t.id} className="border-b border-black/80">
                  <td className="border border-black py-1.5 text-center font-medium">{idx + 1}</td>
                  <td className="border border-black py-1.5 px-2 font-mono font-bold text-center">
                    {t.pelanggan.kodePelanggan || t.pelanggan.noTelepon}
                  </td>
                  <td className="border border-black py-1.5 px-3 font-semibold">{t.pelanggan.nama}</td>
                  <td className="border border-black py-1.5 px-3 truncate max-w-xs">{t.pelanggan.alamat}</td>
                  <td className="border border-black py-1.5 px-2 text-center">{t.pelanggan.rtRw || "-"}</td>
                  <td className="border border-black py-1.5 px-2 text-right font-mono font-semibold">
                    {formatRupiah(t.jumlah).replace("Rp", "").trim()}
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center font-bold text-[11px]">
                    {isLunas ? "✓ LUNAS" : "BELUM"}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-center">
                    {isLunas ? (
                      <span className="text-[10px] text-gray-600">
                        {t.tanggalLunas ? formatDate(t.tanggalLunas) : "Lunas"}
                      </span>
                    ) : (
                      <span className="inline-block w-full border-b border-dotted border-gray-400 h-4" />
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {listTagihan.length > 0 && (
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t border-black">
              <td colSpan={5} className="border border-black py-2 px-3 text-right">TOTAL KESELURUHAN:</td>
              <td className="border border-black py-2 px-2 text-right font-mono">{formatRupiah(totalTagihan).replace("Rp", "").trim()}</td>
              <td colSpan={2} className="border border-black py-2 px-2 text-center text-[10px]">
                Lunas: {formatRupiah(totalLunas)} | Sisa: {formatRupiah(totalBelum)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Lembar Tanda Tangan Pengesahan */}
      <div className="mt-8 grid grid-cols-2 text-center text-xs break-inside-avoid">
        <div>
          <p className="font-medium text-gray-700">Mengetahui,</p>
          <p className="font-bold text-slate-900 mt-0.5">Pengurus Lingkungan / Ketua RT</p>
          <div className="h-16" />
          <p className="font-bold underline">( .................................................... )</p>
        </div>
        <div>
          <p className="font-medium text-gray-700">Kota Depok, {formatDate(now)}</p>
          <p className="font-bold text-slate-900 mt-0.5">Petugas Penagihan UPS HERU</p>
          <div className="h-16" />
          <p className="font-bold underline">( {session?.nama || "Petugas Lapangan"} )</p>
        </div>
      </div>
    </div>
  );
}
