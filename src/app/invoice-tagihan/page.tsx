import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import TombolPrintInvoice from "@/components/TombolPrintInvoice";

export const metadata: Metadata = {
  title: "Faktur & Kuitansi Tagihan Resmi",
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
import { resolveTenantByHost } from "@/lib/tenant";
import "./invoice.css";

/**
 * Masking nomor telepon untuk halaman publik (anti-enumerasi nomor lengkap):
 * 081299887766 → 0812••••7766.
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
 * Lembar Faktur Retribusi & Kuitansi Pembayaran Resmi — UPS HERU DEPOK
 */
export default async function InvoiceTagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string }>;
}) {
  const { invoice } = await searchParams;
  if (!invoice) notFound();

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const tenantCtx = resolveTenantByHost(host);

  const tagihan = await getTagihanByNoInvoice(invoice, {
    tenantId: tenantCtx.tenant.id,
    isPilot: tenantCtx.isPilot,
  });
  if (!tagihan) notFound();

  const pajakRate = await getPajakDaerahRate();
  const rincian = hitungRincian(tagihan.jumlah, tagihan.denda, pajakRate);
  const lunas = tagihan.status === "lunas";
  const namaPeriode = `${BULAN_INDO[tagihan.bulan - 1]} ${tagihan.tahun}`;
  const baseCompany = companyInfo(host);
  const perusahaan = {
    ...baseCompany,
    logoUrl: tenantCtx.tenant.branding?.logoUrl || "/ups-heru-logo.jpg",
  };

  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;
  const qrData = `${baseUrl}/invoice-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  const pembayaran = tagihan.pembayaran?.[0];
  const pembayaranMetode = pembayaran?.metode || (lunas ? "transfer" : "tunai");

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
          {/* Bar Aksen Identitas Resmi Atas */}
          <div className="invoice-brand-stripe" />

          <div className="invoice-sheet-inner">
            {/* Header Dokumen Resmi */}
            <div className="invoice-header">
              <div className="invoice-brand-identity">
                <div className="invoice-brand-logo-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={perusahaan.logoUrl || "/ups-heru-logo.jpg"}
                    alt={perusahaan.nama}
                    className="invoice-official-logo"
                  />
                </div>
                <div className="invoice-brand-text">
                  <div className="brand-org-name">{perusahaan.nama}</div>
                  <div className="brand-unit-name">
                    {perusahaan.unit || "Unit Pengelolaan & Retribusi Kebersihan (TPS 3R)"}
                  </div>
                  <div className="brand-address-text">{perusahaan.alamat}</div>
                  <div className="brand-contact-row">
                    <span>
                      WhatsApp: <strong>{perusahaan.whatsapp}</strong>
                    </span>
                    <span className="bullet">·</span>
                    <span>Email: {perusahaan.email}</span>
                  </div>
                </div>
              </div>

              <div className="invoice-header-title">
                <div className={`doc-badge-pill ${lunas ? "badge-lunas" : "badge-unpaid"}`}>
                  <span className="badge-icon">{lunas ? "✓" : "•"}</span>
                  <span>{lunas ? "BUKTI PEMBAYARAN SAH & TERVERIFIKASI" : "SURAT TAGIHAN RETRIBUSI RESMI"}</span>
                </div>
                <h1 className="doc-title-main">{lunas ? "KUITANSI RESMI" : "FAKTUR TAGIHAN"}</h1>
                <p className="doc-subtitle">
                  {lunas
                    ? `OFFICIAL RECEIPT — BULAN ${namaPeriode.toUpperCase()}`
                    : `OFFICIAL RETRIBUTION INVOICE — BULAN ${namaPeriode.toUpperCase()}`}
                </p>
                <div className="doc-invoice-number-chip">
                  <span className="chip-label">No. Dokumen:</span>
                  <span className="chip-val font-mono">{tagihan.noInvoice}</span>
                </div>
              </div>
            </div>

            {/* Status Stamp & Metadata Bar */}
            <div className="invoice-meta-bar">
              <div className="meta-card">
                <span className="meta-label">Nomor Dokumen</span>
                <span className="meta-value font-mono">{tagihan.noInvoice}</span>
              </div>
              <div className="meta-card">
                <span className="meta-label">Periode Retribusi</span>
                <span className="meta-value uppercase">{namaPeriode}</span>
              </div>
              <div className="meta-card">
                <span className="meta-label">{lunas ? "Tanggal Pembayaran" : "Tanggal Jatuh Tempo"}</span>
                <span className={`meta-value font-semibold ${lunas ? "text-emerald-700" : "text-rose-700"}`}>
                  {lunas && tagihan.tanggalLunas
                    ? formatTanggalIndo(tagihan.tanggalLunas)
                    : formatTanggalIndo(tagihan.jatuhTempo)}
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
                <div className="party-main-name">{perusahaan.nama} {tenantCtx.tenant.branding?.kota ? tenantCtx.tenant.branding.kota.toUpperCase() : "DEPOK"}</div>
                <div className="party-desc">
                  <p>Penyelenggara Layanan Pengangkutan Sampah Terpadu & TPS 3R</p>
                  <p>{perusahaan.alamat}</p>
                  <p>{tenantCtx.tenant.branding?.kota || "Kota Depok"}</p>
                  <div className="party-chip">LAYANAN RESMI {(tenantCtx.tenant.branding?.kota || "KOTA DEPOK").toUpperCase()}</div>
                </div>
              </div>

              <div className="party-box party-customer">
                <div className="party-heading">WAJIB RETRIBUSI / DITUJUKAN KEPADA:</div>
                <div className="party-main-name">{tagihan.pelanggan.nama}</div>
                <div className="party-meta-grid">
                  <div className="party-meta-row">
                    <span className="meta-k">ID Pelanggan</span>
                    <span className="meta-v font-mono font-bold text-emerald-800">
                      {tagihan.pelanggan.kodePelanggan}
                    </span>
                  </div>
                  <div className="party-meta-row">
                    <span className="meta-k">Kategori</span>
                    <span className="meta-v">
                      {LABEL_KATEGORI[tagihan.pelanggan.kategori] || tagihan.pelanggan.kategori}
                    </span>
                  </div>
                  <div className="party-meta-row">
                    <span className="meta-k">Alamat Lengkap</span>
                    <span className="meta-v">{alamatLengkap || "-"}</span>
                  </div>
                  <div className="party-meta-row">
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
                    {pajakRate > 0 && (
                      <td className="td-ppn text-right tabular-nums">{formatRupiahSkylite(rincian.ppn)}</td>
                    )}
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
                  <div className="legal-icon">
                    <svg className="w-4 h-4 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="legal-text">
                    Dokumen ini adalah bukti transaksi resmi yang sah diterbitkan oleh sistem penagihan digital UPS HERU Kota Depok. Retribusi dipergunakan untuk pemeliharaan kebersihan dan operasional kelestarian lingkungan.
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
                  <div className="grand-total-label">TOTAL {lunas ? "PEMBAYARAN" : "TAGIHAN"}</div>
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
                        <span className="stamp-sub-top">UPS HERU</span>
                        <span className="stamp-main">LUNAS</span>
                        <small className="stamp-sub-bot">KOTA DEPOK</small>
                      </div>
                    </div>
                    <div className="paid-meta-list">
                      <div className="paid-meta-item">
                        <span className="pm-label">Metode Pembayaran</span>
                        <span className="pm-value font-bold text-slate-900">{labelMetodePembayaran(pembayaranMetode)}</span>
                      </div>
                      {tagihan.tanggalLunas && (
                        <div className="paid-meta-item">
                          <span className="pm-label">Waktu Lunas</span>
                          <span className="pm-value tabular-nums font-semibold text-emerald-700">
                            {formatTanggalWaktuIndo(tagihan.tanggalLunas)}
                          </span>
                        </div>
                      )}
                      <div className="paid-meta-item">
                        <span className="pm-label">ID Referensi</span>
                        <span className="pm-value font-mono text-xs">
                          {pembayaran?.duitkuTransaction?.orderId || (pembayaran?.id ? `PAY-${pembayaran.id}` : "PG-AUTO-VERIFIED")}
                        </span>
                      </div>
                      <div className="paid-meta-item">
                        <span className="pm-label">Status Verifikasi</span>
                        <span className="pm-value text-emerald-700 font-semibold">
                          ✓ Terverifikasi Sistem Resmi
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
                      Silakan selesaikan pembayaran sebelum tanggal <strong>{formatTanggalIndo(tagihan.jatuhTempo)}</strong> melalui portal pembayaran resmi atau transfer perbankan:
                    </p>
                    <ul className="unpaid-channels-list">
                      <li>• <strong>QRIS</strong> (BCA, Mandiri, BRI, GoPay, OVO, Dana, ShopeePay)</li>
                      <li>• <strong>Transfer Bank BCA</strong> (Verifikasi Otomatis / Manual)</li>
                      <li>• <strong>Petugas Lapangan</strong> UPS HERU saat penjemputan sampah</li>
                    </ul>
                    <div className="portal-direct-hint">
                      Portal Pembayaran:{" "}
                      <Link
                        href={`/bayar-tagihan?invoice=${encodeURIComponent(tagihan.noInvoice || "")}`}
                        className="underline font-bold text-emerald-700"
                      >
                        {baseUrl}/bayar-tagihan?invoice={encodeURIComponent(tagihan.noInvoice || "")}
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Box QR Code Verifikasi */}
              <div className="invoice-qr-box">
                <div className="qr-frame">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} width={96} height={96} alt="QR-Code Verifikasi Faktur & Pembayaran" />
                </div>
                <div className="qr-text">
                  <span className="qr-headline">{lunas ? "VALIDASI KEASLIAN" : "VALIDASI FAKTUR RESMI"}</span>
                  <span className="qr-sub">
                    {lunas
                      ? "Pindai QR Code untuk memverifikasi keabsahan kuitansi lunas di portal resmi"
                      : "Pindai QR Code dengan ponsel untuk memeriksa keabsahan faktur tagihan ini"}
                  </span>
                </div>
              </div>

              {/* Box Pengesahan Resmi */}
              <div className="invoice-sign-box">
                <span className="sign-city">
                  Kota Depok, {formatTanggalIndo(tagihan.tanggalLunas || tagihan.createdAt || tagihan.jatuhTempo)}
                </span>
                <span className="sign-org">Unit Pengelolaan Retribusi UPS HERU</span>

                <div className="sign-seal-area">
                  <div className="digital-seal">
                    <svg className="w-4 h-4 text-emerald-700 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <span>UPS HERU KOTA DEPOK — PENGELOLAAN SAMPAH RAMAH LINGKUNGAN</span>
              </div>
              <div className="bottom-right tabular-nums text-xs">
                <span>Dokumen dicetak secara digital · {formatTanggalWaktuIndo(new Date())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bawah Halaman (Layar saja) */}
        <div className="invoice-page-foot-screen">
          <p>
            Memerlukan bantuan terkait faktur ini? Hubungi Layanan Pelanggan UPS HERU di WhatsApp{" "}
            <a href={`https://wa.me/${perusahaan.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
              {perusahaan.whatsapp}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
