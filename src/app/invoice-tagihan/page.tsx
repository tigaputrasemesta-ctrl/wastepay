import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import TombolPrintInvoice from "@/components/TombolPrintInvoice";

export const metadata: Metadata = {
  title: "Faktur Tagihan",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};
import {
  getTagihanByNoInvoice,
  hitungRincian,
  formatRupiahSkylite,
  formatTanggalIndo,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  labelMetodePembayaran,
  companyInfo,
  terbilangRupiah,
} from "@/lib/invoice";
import { getPajakDaerahRate } from "@/lib/pengaturan";
import "./invoice.css";

/**
 * Masking nomor telepon untuk halaman publik (anti-enumerasi nomor lengkap):
 * 081234567890 → 0812••••7890.
 */
function maskNoTelepon(no: string | null | undefined): string {
  if (!no) return "-";
  const s = no.trim();
  if (s.length <= 4) return "••••";
  return `${s.slice(0, 4)}••••${s.slice(-4)}`;
}

const LABEL_KATEGORI: Record<string, string> = {
  level_1: "Rumah Tangga — Volume Sangat Kecil",
  level_2: "Rumah Tangga — Volume Kecil–Sedang",
  level_3: "Rumah Tangga — Volume Sedang",
  level_4: "Rumah Tangga — Volume Sedang–Besar",
  level_5: "Rumah Tangga / Usaha Kecil — Volume Besar",
  level_6: "Komersial / Ruko / Niaga — Volume Sangat Besar",
  level_7: "Komersial / Restoran / Sentra Bisnis",
  level_8: "Komersial Skala Besar / Pasar",
  level_9: "Volume Maksimal / Pusat Industri",
  level_10: "Korporasi & Kawasan Khusus",
};

/**
 * /invoice-tagihan?invoice=INV/XXX/YYYYMM
 * Lembar Faktur Retribusi Sampah Resmi — Desain Modern UPS HERU
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

  const pajakRate = await getPajakDaerahRate();
  const rincian = hitungRincian(tagihan.jumlah, tagihan.denda, pajakRate);
  const lunas = tagihan.status === "lunas";
  const namaPeriode = `${BULAN_INDO[tagihan.bulan - 1]} ${tagihan.tahun}`;
  const perusahaan = companyInfo();

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  const qrData = `${baseUrl}/invoice-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  const pembayaran = tagihan.pembayaran?.[0];
  const pembayaranMetode = pembayaran?.metode || "tunai";

  const alamatLengkap = [
    tagihan.pelanggan.alamat,
    tagihan.pelanggan.rtRw ? `RT/RW ${tagihan.pelanggan.rtRw}` : null,
    tagihan.pelanggan.kelurahan?.nama ? `Kel. ${tagihan.pelanggan.kelurahan.nama}` : null,
    tagihan.pelanggan.patokanLokasi ? `Patokan: ${tagihan.pelanggan.patokanLokasi}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="invoice-page-bg">
      <div id="TopLevelWrapper" className="invoice-wrapper">
        {/* Toolbar Aksi (Hanya Tampil di Layar / Non-Print) */}
        <div className="invoice-toolbar">
          <div className="invoice-toolbar-left">
            <Link
              href={`/bayar-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`}
              className="invoice-back-link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Kembali ke Status Pembayaran</span>
            </Link>
          </div>

          <div className="invoice-toolbar-right">
            {!lunas && (
              <Link
                href={`/bayar-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`}
                className="invoice-pay-btn"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Bayar Sekarang</span>
              </Link>
            )}
            <TombolPrintInvoice label="Cetak / Unduh PDF" />
          </div>
        </div>

        {/* Lembar Faktur Fisik / Printable Sheet */}
        <div className="invoice-sheet">
          {/* Bar Hazard / Aksen Identitas Atas */}
          <div className="invoice-brand-stripe" />

          <div className="invoice-sheet-inner">
            {/* Header Dokumen Resmi */}
            <div className="invoice-header">
              <div className="invoice-header-brand">
                <div className="invoice-logo-mark">
                  <span className="logo-tps">UPS</span>
                  <div className="logo-info">
                    <div className="logo-name">
                      HERU<span className="logo-dot">.</span>
                    </div>
                    <span className="logo-sub">UNIT PENGELOLAAN SAMPAH</span>
                  </div>
                </div>
                <div className="invoice-org-details">
                  <p className="org-title">{perusahaan.unit || "Unit Pengelolaan & Retribusi Kebersihan Lingkungan"}</p>
                  <p className="org-address">{perusahaan.alamat}</p>
                  <p className="org-contact">
                    WhatsApp: <strong>{perusahaan.whatsapp}</strong> · Email: {perusahaan.email}
                  </p>
                </div>
              </div>

              <div className="invoice-header-title">
                <div className="doc-badge">SURAT TAGIHAN RESMI</div>
                <h1 className="doc-title">FAKTUR RETRIBUSI</h1>
                <p className="doc-sub">OFFICIAL WASTE RETRIBUTION INVOICE</p>
                <div className="doc-invoice-no">
                  <span>No. Faktur:</span>
                  <strong>{tagihan.noInvoice}</strong>
                </div>
              </div>
            </div>

            {/* Status Stamp & Metadata Bar */}
            <div className="invoice-meta-bar">
              <div className="meta-card">
                <span className="meta-label">Nomor Faktur</span>
                <span className="meta-value font-mono">{tagihan.noInvoice}</span>
              </div>
              <div className="meta-card">
                <span className="meta-label">Periode Retribusi</span>
                <span className="meta-value uppercase">{namaPeriode}</span>
              </div>
              <div className="meta-card">
                <span className="meta-label">Tanggal Jatuh Tempo</span>
                <span className="meta-value font-semibold text-rose-700">
                  {formatTanggalIndo(tagihan.jatuhTempo)}
                </span>
              </div>
              <div className="meta-card status-card">
                <span className="meta-label">Status Pembayaran</span>
                <span className={`status-pill ${lunas ? "status-lunas" : "status-unpaid"}`}>
                  {lunas ? "✓ LUNAS / TERVERIFIKASI" : "MENUNGGU PEMBAYARAN"}
                </span>
              </div>
            </div>

            {/* Pihak Terkait: Penerbit & Wajib Retribusi */}
            <div className="invoice-parties-section">
              <div className="party-box party-issuer">
                <div className="party-heading">DITERBITKAN OLEH:</div>
                <div className="party-main-name">{perusahaan.nama}</div>
                <div className="party-desc">
                  <p>Penyelenggara Layanan Pengangkutan Sampah Terpadu & TPS 3R</p>
                  <p>{perusahaan.alamat}</p>
                  <p>Kota Depok, Jawa Barat</p>
                  <div className="party-chip">LAYANAN RESMI KOTA DEPOK</div>
                </div>
              </div>

              <div className="party-box party-customer">
                <div className="party-heading">WAJIB RETRIBUSI / DITUJUKAN KEPADA:</div>
                <div className="party-main-name">{tagihan.pelanggan.nama}</div>
                <div className="party-meta-grid">
                  <div className="party-meta-row">
                    <span className="meta-k">ID Pelanggan</span>
                    <span className="meta-v font-mono font-bold">{tagihan.pelanggan.kodePelanggan}</span>
                  </div>
                  <div className="meta-k-row">
                    <span className="meta-k">Kategori</span>
                    <span className="meta-v">
                      {LABEL_KATEGORI[tagihan.pelanggan.kategori] || tagihan.pelanggan.kategori}
                    </span>
                  </div>
                  <div className="meta-k-row">
                    <span className="meta-k">Alamat Lengkap</span>
                    <span className="meta-v">{alamatLengkap || "-"}</span>
                  </div>
                  <div className="meta-k-row">
                    <span className="meta-k">Kontak WA / HP</span>
                    <span className="meta-v font-medium">{maskNoTelepon(tagihan.pelanggan.noTelepon)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Rincian Retribusi */}
            <div className="invoice-table-wrapper">
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th className="th-no">No</th>
                    <th className="th-desc">Uraian Komponen Retribusi</th>
                    <th className="th-period">Periode</th>
                    <th className="th-base text-right">Tarif Dasar</th>
                    {pajakRate > 0 && <th className="th-ppn text-right">Pajak Daerah ({pajakRate}%)</th>}
                    <th className="th-total text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="td-no tabular-nums">01</td>
                    <td className="td-desc">
                      <strong>
                        {tagihan.keterangan || "Jasa Pengangkutan & Pengolahan Sampah Lingkungan"}
                      </strong>
                      <p className="item-subtext">
                        Pelayanan angkut sampah terpadu, pemilahan organik/anorganik, dan operasional TPS 3R
                      </p>
                    </td>
                    <td className="td-period font-medium">{namaPeriode}</td>
                    <td className="td-base text-right tabular-nums">{formatRupiahSkylite(rincian.base)}</td>
                    {pajakRate > 0 && <td className="td-ppn text-right tabular-nums">{formatRupiahSkylite(rincian.ppn)}</td>}
                    <td className="td-total text-right tabular-nums font-bold">
                      {formatRupiahSkylite(rincian.subTotalPpn)}
                    </td>
                  </tr>

                  {tagihan.denda ? (
                    <tr className="row-denda">
                      <td className="td-no tabular-nums">02</td>
                      <td className="td-desc">
                        <strong className="text-rose-700">Denda / Sanksi Keterlambatan Pembayaran</strong>
                        <p className="item-subtext">
                          Biaya kompensasi administrasi keterlambatan pembayaran tagihan
                        </p>
                      </td>
                      <td className="td-period font-medium">{namaPeriode}</td>
                      <td className="td-base text-right tabular-nums">{formatRupiahSkylite(tagihan.denda)}</td>
                      <td className="td-ppn text-right tabular-nums">Rp0,-</td>
                      <td className="td-total text-right tabular-nums font-bold text-rose-700">
                        {formatRupiahSkylite(tagihan.denda)}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Terbilang & Perhitungan Total */}
            <div className="invoice-summary-container">
              {/* Kolom Terbilang & Catatan Legal */}
              <div className="summary-left">
                <div className="terbilang-card">
                  <span className="terbilang-title">TERBILANG (IN WORDS):</span>
                  <p className="terbilang-words">
                    &ldquo;{terbilangRupiah(rincian.total)}&rdquo;
                  </p>
                </div>

                <div className="invoice-legal-note">
                  <div className="legal-icon">ℹ️</div>
                  <p className="legal-text">
                    Faktur retribusi ini adalah dokumen resmi yang sah diterbitkan oleh sistem penagihan terpadu UPS HERU. Retribusi digunakan untuk operasional kebersihan dan kelestarian lingkungan Kota Depok.
                  </p>
                </div>
              </div>

              {/* Kolom Kalkulasi Angka */}
              <div className="summary-right">
                <div className="calc-row">
                  <span className="calc-label">Subtotal Tarif Pokok</span>
                  <span className="calc-val tabular-nums font-semibold">{formatRupiahSkylite(rincian.base)}</span>
                </div>
                {pajakRate > 0 && (
                  <div className="calc-row">
                    <span className="calc-label">Pajak Daerah ({pajakRate}%)</span>
                    <span className="calc-val tabular-nums font-semibold">+ {formatRupiahSkylite(rincian.ppn)}</span>
                  </div>
                )}
                {tagihan.denda ? (
                  <div className="calc-row text-rose-700">
                    <span className="calc-label">Denda Keterlambatan</span>
                    <span className="calc-val tabular-nums font-semibold">+ {formatRupiahSkylite(tagihan.denda)}</span>
                  </div>
                ) : null}

                <div className="grand-total-box">
                  <div className="grand-total-label">TOTAL TAGIHAN</div>
                  <div className="grand-total-amount tabular-nums font-bold">
                    {formatRupiahSkylite(rincian.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Verifikasi Pembayaran & Tanda Tangan Digital */}
            <div className="invoice-settlement-row">
              {/* Box Status / Panduan Pembayaran */}
              <div className="settlement-info-box">
                {lunas ? (
                  <div className="paid-settlement-content">
                    <div className="paid-stamp-wrapper">
                      <div className="paid-official-stamp">
                        <span>LUNAS</span>
                        <small>UPS HERU DEPOK</small>
                      </div>
                    </div>
                    <div className="paid-meta-list">
                      <div className="paid-meta-item">
                        <span className="pm-label">Metode Pembayaran:</span>
                        <span className="pm-value font-bold">{labelMetodePembayaran(pembayaranMetode)}</span>
                      </div>
                      {tagihan.tanggalLunas && (
                        <div className="paid-meta-item">
                          <span className="pm-label">Tanggal Lunas:</span>
                          <span className="pm-value tabular-nums font-semibold">
                            {formatTanggalWaktuIndo(tagihan.tanggalLunas)}
                          </span>
                        </div>
                      )}
                      <div className="paid-meta-item">
                        <span className="pm-label">ID Transaksi / Ref:</span>
                        <span className="pm-value font-mono">
                          {pembayaran?.duitkuTransaction?.orderId || (pembayaran?.id ? `PAY-${pembayaran.id}` : "PG-AUTO-VERIFIED")}
                        </span>
                      </div>
                      <div className="paid-meta-item">
                        <span className="pm-label">Verifikator:</span>
                        <span className="pm-value">
                          {pembayaran?.verifiedBy?.nama || "Payment Gateway Otomatis UPS HERU"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="unpaid-instruction-content">
                    <div className="unpaid-badge-box">
                      <span className="unpaid-dot" />
                      <strong>MENUNGGU PEMBAYARAN</strong>
                    </div>
                    <p className="unpaid-guide-text">
                      Silakan selesaikan pembayaran sebelum tanggal <strong>{formatTanggalIndo(tagihan.jatuhTempo)}</strong> melalui portal online atau transfer perbankan:
                    </p>
                    <ul className="unpaid-channels-list">
                      <li>• <strong>QRIS</strong> (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay)</li>
                      <li>• <strong>Virtual Account</strong> Bank Resmi & Transfer Otomatis</li>
                      <li>• <strong>Petugas Lapangan</strong> UPS HERU saat penjemputan sampah</li>
                    </ul>
                    <div className="portal-direct-hint">
                      Portal Pembayaran: <code>{baseUrl}/bayar-tagihan?invoice={encodeURIComponent(tagihan.noInvoice || "")}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Box QR Code Verifikasi */}
              <div className="invoice-qr-box">
                <div className="qr-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} width={110} height={110} alt="QR-Code Verifikasi Faktur" />
                </div>
                <div className="qr-text">
                  <span className="qr-headline">VALIDASI KEASLIAN</span>
                  <span className="qr-sub">Scan QR Code untuk memverifikasi dokumen di portal resmi</span>
                </div>
              </div>

              {/* Box Pengesahan Resmi */}
              <div className="invoice-sign-box">
                <span className="sign-city">Kota Depok, {formatTanggalIndo(tagihan.createdAt || tagihan.jatuhTempo)}</span>
                <span className="sign-org">Unit Pengelolaan Retribusi UPS HERU</span>
                
                <div className="sign-seal-area">
                  <div className="digital-seal">
                    <svg className="w-5 h-5 text-emerald-700 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>TERVALIDASI SECARA ELEKTRONIK</span>
                  </div>
                </div>

                <div className="sign-signer">
                  <strong>Bendahara Retribusi UPS HERU</strong>
                  <span className="font-mono text-[9px] text-gray-500">ID SISTEM: UPS-FIN-DPK</span>
                </div>
              </div>
            </div>

            {/* Footer Bawah Lembar Faktur */}
            <div className="invoice-bottom-bar">
              <div className="bottom-left">
                <span>UPS HERU DEPOK — PENGELOLAAN SAMPAH RAMAH LINGKUNGAN</span>
              </div>
              <div className="bottom-right tabular-nums text-xs">
                <span>Dokumen di-generate: {formatTanggalWaktuIndo(new Date())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bawah Halaman (Layar saja) */}
        <div className="invoice-page-foot-screen">
          <p>
            Memerlukan bantuan terkait faktur ini? Hubungi Customer Care UPS HERU di WhatsApp{" "}
            <a href={`https://wa.me/${perusahaan.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
              {perusahaan.whatsapp}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
