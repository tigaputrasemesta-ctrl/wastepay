import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getKlaimById, formatNoSlip } from "@/lib/slip";
import { labelKategoriPengeluaran } from "@/lib/laporan";
import TombolCetak from "@/components/TombolCetak";
import { formatRupiah, formatDate } from "@/lib/utils";
import { formatTanggalWaktuIndo, companyInfo } from "@/lib/invoice-format";
import "../slip.css";

const STATUS_LABEL: Record<string, string> = {
  menunggu: "Menunggu Persetujuan",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
};

/**
 * /klaim-cetak/[id] — Slip klaim dana lapangan petugas (printable via window.print).
 */
export default async function KlaimCetakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) notFound();

  const k = await getKlaimById(id);
  if (!k) notFound();

  const perusahaan = companyInfo();
  const noSlip = formatNoSlip("klaim", k.id);
  const disetujui = k.status === "disetujui";

  return (
    <div className="slip-page-bg">
      <div className="slip-wrapper">
        <div className="slip-toolbar">
          <div className="slip-toolbar-title">Slip Klaim {noSlip}</div>
          <div className="slip-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href="/klaim" className="slip-toolbar-link">
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

          <div className="slip-title">SLIP KLAIM DANA LAPANGAN</div>
          <div className="slip-no">Nomor: {noSlip}</div>

          <table className="slip-table">
            <tbody>
              <tr>
                <td>Nama Petugas</td>
                <td>{k.petugas.nama}{k.petugas.jabatan ? ` (${k.petugas.jabatan})` : ""}</td>
              </tr>
              <tr>
                <td>Tanggal Pengajuan</td>
                <td>{formatDate(k.tanggal)}</td>
              </tr>
              <tr>
                <td>Kategori</td>
                <td>{labelKategoriPengeluaran(k.kategori)}</td>
              </tr>
              <tr>
                <td>Keterangan</td>
                <td>{k.keterangan}</td>
              </tr>
              <tr className="slip-nominal-row">
                <td>Nominal</td>
                <td>{formatRupiah(k.nominal)}</td>
              </tr>
            </tbody>
          </table>

          <div className={`slip-status slip-status-${k.status}`}>
            Status: {STATUS_LABEL[k.status] || k.status}
          </div>

          {k.status !== "menunggu" && (
            <div className="slip-meta">
              <p>
                Diproses oleh: <b>{k.diperiksaBy?.nama || "-"}</b>
                {k.waktuDiperiksa ? ` pada ${formatTanggalWaktuIndo(k.waktuDiperiksa)}` : ""}
              </p>
              {k.catatanAdmin && <p>Catatan admin: <b>{k.catatanAdmin}</b></p>}
            </div>
          )}

          <div className="slip-sign">
            <div className="slip-sign-box">
              <p>Petugas,</p>
              <div className="slip-sign-space" />
              <p className="slip-sign-name">({k.petugas.nama})</p>
            </div>
            <div className="slip-sign-box">
              <p>Mengetahui,</p>
              <div className="slip-sign-space" />
              <p className="slip-sign-name">({k.diperiksaBy?.nama || "................"})</p>
            </div>
          </div>

          <div className="slip-foot">
            Dokumen di-generate pada {formatTanggalWaktuIndo(new Date())} · {perusahaan.nama}
            {disetujui ? " · Slip ini sah sebagai bukti penggantian dana" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
