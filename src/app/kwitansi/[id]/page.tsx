import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import { getPembayaranById, formatNoKwitansi } from "@/lib/kwitansi";
import TombolCetak from "@/components/TombolCetak";
import {
  hitungRincian,
  formatRupiahSkylite,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  labelMetodePembayaran,
  companyInfo,
} from "@/lib/invoice-format";
import "../kwitansi.css";

const STATUS_LABEL: Record<string, string> = {
  terverifikasi: "Lunas / Terverifikasi",
  pending: "Pending (Menunggu Verifikasi)",
  ditolak: "Ditolak",
};

/**
 * /kwitansi/[id] — Kwitansi pembayaran printable (PDF via window.print).
 * Hanya untuk pengguna login (admin/kasir/petugas). Petugas dibatasi scope kelurahan
 * (nonaktif sementara — PETUGAS_SCOPE_ALL = semua kelurahan).
 */
export default async function KwitansiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) notFound();

  const p = await getPembayaranById(id);
  if (!p) notFound();

  // Scope kelurahan untuk petugas (anti-enumerasi: 404, bukan 403)
  if (session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    const kelurahanId = await getPetugasKelurahan(session.id);
    if (!kelurahanId || p.pelanggan.kelurahanId !== kelurahanId) {
      notFound();
    }
  }

  const perusahaan = companyInfo();
  const noKwitansi = formatNoKwitansi(p.id);
  const periode = `${BULAN_INDO[p.tagihan.bulan - 1]} ${p.tagihan.tahun}`;
  const rincian = hitungRincian(p.tagihan.jumlah, p.tagihan.denda);
  const terverifikasi = p.status === "terverifikasi";
  const metodeLabel = labelMetodePembayaran(p.metode);

  // Kwitansi hanya diterbitkan untuk pembayaran terverifikasi.
  if (!terverifikasi) {
    return (
      <div className="kwitansi-page-bg">
        <div className="kwitansi-wrapper">
          <div className="kwitansi-notice">
            <div className="notice-badge">KWITANSI BELUM TERSEDIA</div>
            <h1>Pembayaran Belum Terverifikasi</h1>
            <p>
              Kwitansi hanya diterbitkan untuk pembayaran berstatus{" "}
              <b>Terverifikasi</b>. Status pembayaran saat ini:{" "}
              <b>{STATUS_LABEL[p.status] || p.status}</b>.
            </p>
            <p className="notice-meta">
              Pelanggan: {p.pelanggan.nama} ({p.pelanggan.kodePelanggan}) · Periode {periode}
            </p>
            <Link href="/tagihan" className="notice-link">
              &larr; Kembali ke Tagihan
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const referensi = p.duitkuTransaction?.orderId || "-";

  return (
    <div className="kwitansi-page-bg">
      <div className="kwitansi-wrapper">
        {/* Toolbar (hanya tampil di layar) */}
        <div className="kwitansi-toolbar">
          <div className="kwitansi-toolbar-title">
            Kwitansi {noKwitansi} — {p.pelanggan.nama}
          </div>
          <div className="kwitansi-toolbar-actions">
            <TombolCetak />
            <Link href="/tagihan" className="toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        {/* Lembar kwitansi */}
        <div className="kwitansi-sheet">
          {/* Kepala */}
          <div className="kwitansi-head">
            <div className="kwitansi-logo">
              <div className="kwitansi-logo-box">O2W</div>
              <span className="kwitansi-logo-text">
                {perusahaan.nama}
                <em>UNIT PENGELOLA SAMPAH</em>
              </span>
            </div>
            <div className="kwitansi-number">
              <span>Nomor Kwitansi</span>
              <strong>{noKwitansi}</strong>
            </div>
          </div>

          {/* Judul dokumen */}
          <div className="kwitansi-doc-title">
            KWITANSI / BUKTI PEMBAYARAN
          </div>

          {/* Info pihak */}
          <div className="kwitansi-info">
            <div className="kwitansi-info-row">
              <span>Telah diterima dari</span>
              <p>
                {p.pelanggan.nama}{" "}
                <b className="kwitansi-code">({p.pelanggan.kodePelanggan})</b>
              </p>
            </div>
            <div className="kwitansi-info-row">
              <span>Uang sejumlah</span>
              <p className="kwitansi-amount">
                {formatRupiahSkylite(rincian.total)}
              </p>
            </div>
            <div className="kwitansi-info-row">
              <span>Untuk pembayaran</span>
              <p>
                {p.tagihan.keterangan || `Iuran sampah ${periode}`}
                {p.tagihan.noInvoice && (
                  <span className="kwitansi-invoice"> · No. Invoice {p.tagihan.noInvoice}</span>
                )}
              </p>
            </div>
            <div className="kwitansi-info-row">
              <span>Alamat pelanggan</span>
              <p>{p.pelanggan.alamat || "-"}</p>
            </div>
            <div className="kwitansi-info-row">
              <span>Tanggal pembayaran</span>
              <p>{formatTanggalWaktuIndo(p.tanggal)}</p>
            </div>
          </div>

          {/* Rincian */}
          <div className="kwitansi-items">
            <div className="kwitansi-items-head">
              <div>Rincian</div>
              <div>Nominal</div>
            </div>
            <div className="kwitansi-item">
              <div>Iuran {periode}</div>
              <div>{formatRupiahSkylite(rincian.base)}</div>
            </div>
            <div className="kwitansi-item">
              <div>PPN (11%)</div>
              <div>{formatRupiahSkylite(rincian.ppn)}</div>
            </div>
            {rincian.denda > 0 && (
              <div className="kwitansi-item kwitansi-item-denda">
                <div>Denda keterlambatan</div>
                <div>{formatRupiahSkylite(rincian.denda)}</div>
              </div>
            )}
            <div className="kwitansi-total">
              <div>TOTAL DIBAYAR</div>
              <div>{formatRupiahSkylite(rincian.total)}</div>
            </div>
          </div>

          {/* Detail pembayaran */}
          <div className="kwitansi-detail">
            <div className="kwitansi-detail-row">
              <span>Metode pembayaran</span>
              <p>{metodeLabel}</p>
            </div>
            <div className="kwitansi-detail-row">
              <span>Status</span>
              <p className="kwitansi-lunas">LUNAS / TERVERIFIKASI</p>
            </div>
            <div className="kwitansi-detail-row">
              <span>Referensi transaksi</span>
              <p>{referensi}</p>
            </div>
            <div className="kwitansi-detail-row">
              <span>Diterima oleh</span>
              <p>{p.verifiedBy?.nama || "Sistem (verifikasi otomatis)"}</p>
            </div>
          </div>

          {/* Tanda tangan */}
          <div className="kwitansi-sign">
            <div className="kwitansi-sign-box">
              <p>Diterima oleh,</p>
              <div className="kwitansi-sign-space" />
              <p className="kwitansi-sign-name">
                ({p.verifiedBy?.nama || "Petugas / Kasir"})
              </p>
            </div>
            <div className="kwitansi-sign-box">
              <p>Pembayar,</p>
              <div className="kwitansi-sign-space" />
              <p className="kwitansi-sign-name">({p.pelanggan.nama})</p>
            </div>
          </div>

          {/* Footer */}
          <div className="kwitansi-foot">
            <p>{perusahaan.nama} · {perusahaan.alamat}</p>
            <p>
              WhatsApp: {perusahaan.whatsapp} · Email: {perusahaan.email}
            </p>
            <p className="kwitansi-foot-gen">
              Dokumen di-generate pada {formatTanggalWaktuIndo(new Date())} — sah tanpa tanda tangan basah
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
