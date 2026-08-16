import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPengeluaranById, formatNoSlip } from "@/lib/slip";
import { labelKategoriPengeluaran } from "@/lib/laporan";
import TombolCetak from "@/components/TombolCetak";
import { formatRupiah, formatDate } from "@/lib/utils";
import { formatTanggalWaktuIndo, companyInfo } from "@/lib/invoice-format";
import "../klaim-cetak/slip.css";

/**
 * /pengeluaran-cetak/[id] — Slip pengeluaran operasional (printable via window.print).
 */
export default async function PengeluaranCetakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) notFound();

  const p = await getPengeluaranById(id);
  if (!p) notFound();

  const perusahaan = companyInfo();
  const noSlip = formatNoSlip("pengeluaran", p.id);

  return (
    <div className="slip-page-bg">
      <div className="slip-wrapper">
        <div className="slip-toolbar">
          <div className="slip-toolbar-title">Slip Pengeluaran {noSlip}</div>
          <div className="slip-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href="/pengeluaran" className="slip-toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        <div className="slip-sheet">
          <div className="slip-head">
            <div className="slip-logo-box">O2W</div>
            <div>
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat}</p>
            </div>
          </div>

          <div className="slip-title">SLIP PENGELUARAN</div>
          <div className="slip-no">Nomor: {noSlip}</div>

          <table className="slip-table">
            <tbody>
              <tr>
                <td>Tanggal</td>
                <td>{formatDate(p.tanggal)}</td>
              </tr>
              <tr>
                <td>Kategori</td>
                <td>{labelKategoriPengeluaran(p.kategori)}</td>
              </tr>
              <tr>
                <td>Keterangan</td>
                <td>{p.keterangan}</td>
              </tr>
              <tr className="slip-nominal-row">
                <td>Jumlah</td>
                <td>{formatRupiah(p.jumlah)}</td>
              </tr>
            </tbody>
          </table>

          <div className="slip-meta" style={{ marginTop: 18 }}>
            <p>Dicatat oleh: <b>{p.dicatatBy.nama}</b></p>
          </div>

          <div className="slip-sign">
            <div className="slip-sign-box">
              <p>Pencatat,</p>
              <div className="slip-sign-space" />
              <p className="slip-sign-name">({p.dicatatBy.nama})</p>
            </div>
            <div className="slip-sign-box">
              <p>Mengetahui,</p>
              <div className="slip-sign-space" />
              <p className="slip-sign-name">(................)</p>
            </div>
          </div>

          <div className="slip-foot">
            Dokumen di-generate pada {formatTanggalWaktuIndo(new Date())} · {perusahaan.nama}
          </div>
        </div>
      </div>
    </div>
  );
}
