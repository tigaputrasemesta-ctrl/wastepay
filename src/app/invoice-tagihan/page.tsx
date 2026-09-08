import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import TombolPrintInvoice from "@/components/TombolPrintInvoice";
import {
  getTagihanByNoInvoice,
  hitungRincian,
  formatRupiahSkylite,
  formatTanggalIndo,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  PPN_RATE,
  labelMetodePembayaran,
  companyInfo,
} from "@/lib/invoice";
import "./invoice.css";

/**
 * Masking nomor telepon untuk halaman publik (invoice bisa di-enumerate):
 * 081234567890 → 0812••••7890. Konsisten dengan /api/publik/tagihan-detail
 * yang juga tidak mengekspos noTelepon lengkap.
 */
function maskNoTelepon(no: string | null | undefined): string {
  if (!no) return "";
  const s = no.trim();
  if (s.length <= 4) return "••••";
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

/**
 * /invoice-tagihan?invoice=INV/XXX/202606
 * Invoice printable (PDF via window.print) — pola skylite.id.
 */
export default async function InvoiceTagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { invoice } = await searchParams;
  if (!invoice) notFound();

  const tagihan = await getTagihanByNoInvoice(invoice);
  if (!tagihan) notFound();

  const rincian = hitungRincian(tagihan.jumlah, tagihan.denda);
  const lunas = tagihan.status === "lunas";
  const namaPeriode = `${BULAN_INDO[tagihan.bulan - 1]} ${tagihan.tahun}`;
  const perusahaan = companyInfo();

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  const qrData = `${baseUrl}/invoice-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

  const pembayaran = tagihan.pembayaran[0];
  const pembayaranMetode = pembayaran?.metode || "tunai";

  return (
    <div className="invoice-page-bg">
      <div id="TopLevelWrapper" className="invoice-wrapper">
        <div className="invoice-toolbar">
          <div className="left-section">
            <strong>
              Invoice Periode {namaPeriode} - {tagihan.pelanggan.nama}
            </strong>
          </div>
          <div className="right-section">
            <TombolPrintInvoice />
            <Link href={`/bayar-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`}>
              ← Kembali ke status tagihan
            </Link>
          </div>
        </div>

        <div className="invoice-sheet">
          {/* Header: logo + nomor invoice */}
          <div className="invoice-head">
            <div className="logo">
              <div className="logo-box">TPS</div>
              <span className="logo-text">TPS HERU DEPOK</span>
            </div>
            <div className="invoice-number">
              <h4>Nomor Invoice</h4>
              <span>{tagihan.noInvoice}</span>
            </div>
          </div>

          {/* Penerbit & penerima */}
          <div className="invoice-parties">
            <div>
              <div className="party-label">Diterbitkan Oleh:</div>
              <strong>{perusahaan.nama}</strong>
              <p className="party-address">
                {perusahaan.alamat} <br />
                WhatsApp: {perusahaan.whatsapp}<br />
                Email: {perusahaan.email}
              </p>
            </div>
            <div>
              <div className="party-label">Ditujukan Kepada:</div>
              <div className="party-row">
                <span>Yth. Bapak/Ibu&nbsp;</span>
                <p>
                  {tagihan.pelanggan.nama}{" "}
                  {tagihan.pelanggan.noTelepon ? `(${maskNoTelepon(tagihan.pelanggan.noTelepon)})` : ""}
                </p>
              </div>
              <div className="party-row">
                <span>ID Pelanggan&nbsp;</span>
                <p>{tagihan.pelanggan.kodePelanggan}</p>
              </div>
              <div className="party-row">
                <span>Jatuh Tempo&nbsp;</span>
                <p>{formatTanggalIndo(tagihan.jatuhTempo)}</p>
              </div>
            </div>
          </div>

          {/* Tabel layanan */}
          <div className="invoice-items">
            <div className="items-header">
              <div className="col-name">Informasi Layanan</div>
              <div className="col-price">Subtotal</div>
            </div>
            <div className="item-row">
              <div className="col-name">
                <span className="item-title">
                  {tagihan.keterangan || `Iuran sampah ${namaPeriode}`}
                </span>
              </div>
              <div className="col-price">
                <p>{formatRupiahSkylite(rincian.base)}</p>
              </div>
            </div>
            {tagihan.denda ? (
              <div className="item-row">
                <div className="col-name">
                  <span className="item-title">Denda keterlambatan</span>
                </div>
                <div className="col-price">
                  <p>{formatRupiahSkylite(tagihan.denda)}</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Ringkasan PPN + total */}
          <div className="invoice-summary">
            <div className="summary-row">
              <p>Biaya PPN ({PPN_RATE}%)</p>
              <p>+ {formatRupiahSkylite(rincian.ppn)}</p>
            </div>
            {tagihan.denda ? (
              <div className="summary-row">
                <p>Denda</p>
                <p>+ {formatRupiahSkylite(tagihan.denda)}</p>
              </div>
            ) : null}
            <div className="summary-total">
              <h5>TOTAL</h5>
              <h4>{formatRupiahSkylite(rincian.total)}</h4>
            </div>
          </div>

          {/* Status pembayaran + QR */}
          <div className="invoice-footer">
            <div>
              {lunas ? (
                <>
                  <p className="footer-text">Invoice ini sudah dilunaskan dengan metode:</p>
                  <h6>{labelMetodePembayaran(pembayaranMetode)}</h6>
                  {tagihan.tanggalLunas && (
                    <p className="footer-text">
                      Dibayar pada {formatTanggalWaktuIndo(tagihan.tanggalLunas)}
                    </p>
                  )}
                  <p className="footer-text">Pembayaran diproses oleh petugas:</p>
                  <h6>Payment Gateway</h6>
                </>
              ) : (
                <>
                  <p className="footer-text">Status: <strong>Belum Dibayar</strong></p>
                  <p className="footer-text">
                    Selesaikan pembayaran sebelum {formatTanggalIndo(tagihan.jatuhTempo)}
                  </p>
                </>
              )}
              <div className="footer-note">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ display: "inline-block", verticalAlign: "middle" }}>
                  <path fillRule="evenodd" clipRule="evenodd" d="M17.641 5.18a3.46 3.46 0 0 0 1.439.37 1.68 1.68 0 0 1 1.61 1.84v3.5c0 5.42-3.37 8.21-6.69 10.21a3 3 0 0 1-2.01.64 3.7 3.7 0 0 1-2-.6c-4.05-2.33-6.76-4.97-6.76-10.25v-3.5a1.75 1.75 0 0 1 1.65-1.84 3.57 3.57 0 0 0 2.41-1.26 6.46 6.46 0 0 1 4.69-2.05 5.9 5.9 0 0 1 4.51 2 3.46 3.46 0 0 0 1.151.94ZM13.23 19.89c4.25-2.61 6-5.21 6-9l.02-3.5c0-.08-.01-.34-.15-.34a4.89 4.89 0 0 1-3.62-1.72A4.42 4.42 0 0 0 12 3.74a5 5 0 0 0-3.71 1.67 4.92 4.92 0 0 1-3.35 1.64c-.07 0-.15.18-.15.34v3.54c0 4.57 2.28 6.82 6 8.95.362.25.79.39 1.23.4a1.51 1.51 0 0 0 1.07-.28l.14-.11ZM11 13l3-3a.75.75 0 0 1 1 1l-3.46 3.53a.74.74 0 0 1-.53.22.78.78 0 0 1-.51-.2l-2.08-1.91a.75.75 0 0 1 1-1.11L11 13Z" />
                </svg>
                <p>
                  Invoice ini resmi dan diproses secara otomatis oleh sistem.
                  <br />
                  Hubungi Customer Service kami untuk informasi lebih lanjut.
                </p>
              </div>
            </div>
            <div className="qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} width={110} alt="QR-Code Invoice" />
              <span className="qr-caption">Scan untuk verifikasi</span>
            </div>
          </div>

          {/* Footer bawah */}
          <div className="invoice-bottom">
            <p>~ Supported By TPS HERU DEPOK</p>
            <span>Invoice ini di-generate pada: {formatTanggalWaktuIndo(new Date())}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
