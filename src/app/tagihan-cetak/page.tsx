import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import {
  getTagihanMassal,
  hitungRincian,
  formatRupiahSkylite,
  formatTanggalIndo,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  PPN_RATE,
  companyInfo,
  terbilangRupiah,
} from "@/lib/invoice";
import TombolCetak from "@/components/TombolCetak";
import "./tagihan-cetak.css";

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
 * /tagihan-cetak?bulan=&tahun= — Cetak massal tagihan satu periode (PDF via window.print).
 * Satu tagihan = satu lembar print-friendly untuk didistribusikan ke pelanggan.
 */
export default async function TagihanCetakPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const now = new Date();
  const bulan = Math.min(
    12,
    Math.max(1, parseInt(sp.bulan || String(now.getMonth() + 1)) || now.getMonth() + 1)
  );
  const tahun = parseInt(sp.tahun || String(now.getFullYear())) || now.getFullYear();

  let tagihan = await getTagihanMassal(bulan, tahun);

  // Scope kelurahan untuk petugas
  if (session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    const kelurahanId = await getPetugasKelurahan(session.id);
    if (kelurahanId) {
      tagihan = tagihan.filter(
        (t) => t.pelanggan.kelurahanId === kelurahanId
      );
    }
  }

  const perusahaan = companyInfo();
  const periode = `${BULAN_INDO[bulan - 1]} ${tahun}`;

  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="tc-page-bg">
      <div className="tc-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="tc-toolbar">
          <div className="tc-toolbar-title">
            <strong>Cetak Massal Tagihan</strong> — Periode {periode} · {tagihan.length} tagihan terbit
          </div>
          <div className="tc-toolbar-actions">
            <TombolCetak label="Cetak Semua / Unduh PDF" />
            <Link href={`/tagihan?bulan=${bulan}&tahun=${tahun}`} className="tc-toolbar-link">
              &larr; Kembali ke Dashboard Tagihan
            </Link>
          </div>
        </div>

        {tagihan.length === 0 ? (
          <div className="tc-empty">
            <span className="text-4xl block mb-3">📋</span>
            <h1>Tidak Ada Tagihan</h1>
            <p>Tidak ditemukan tagihan aktif untuk periode {periode}.</p>
            <Link href="/tagihan" className="tc-empty-link">
              ← Kembali ke Menu Tagihan
            </Link>
          </div>
        ) : (
          tagihan.map((t, idx) => {
            const rincian = hitungRincian(t.jumlah, t.denda);
            const lunas = t.status === "lunas";
            const pembayaran = t.pembayaran?.[0];
            const alamatLengkap = [
              t.pelanggan.alamat,
              t.pelanggan.rtRw ? `RT/RW ${t.pelanggan.rtRw}` : null,
              t.pelanggan.patokanLokasi ? `Patokan: ${t.pelanggan.patokanLokasi}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            const qrData = `${baseUrl}/invoice-tagihan?invoice=${encodeURIComponent(t.noInvoice || "")}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrData)}`;

            return (
              <div className="tc-invoice" key={t.id}>
                {/* Aksen Top Stripe */}
                <div className="tc-stripe" />

                {/* Kepala Surat */}
                <div className="tc-head">
                  <div className="tc-brand">
                    <div className="tc-logo-box">TPS</div>
                    <div className="tc-company">
                      <div className="tc-brand-title">
                        HERU<span className="text-emerald-500">.</span>
                        <span className="tc-brand-unit">PENGELOLAAN SAMPAH</span>
                      </div>
                      <p className="tc-company-addr">{perusahaan.alamat} · WA: {perusahaan.whatsapp}</p>
                    </div>
                  </div>

                  <div className="tc-invoice-no">
                    <span className="tc-doc-badge">SURAT TAGIHAN RESMI</span>
                    <strong className="tc-inv-code">{t.noInvoice || `INV-${t.id}`}</strong>
                    <span className={`tc-status ${lunas ? "tc-status-lunas" : "tc-status-belum"}`}>
                      {lunas ? "✓ LUNAS" : "MENUNGGU BAYAR"}
                    </span>
                  </div>
                </div>

                {/* Info Pelanggan & Jatuh Tempo */}
                <div className="tc-customer">
                  <div className="tc-party">
                    <span className="tc-label">Ditujukan Kepada (Wajib Retribusi):</span>
                    <h2 className="tc-client-name">{t.pelanggan.nama}</h2>
                    <p className="tc-address">{alamatLengkap}</p>
                    <div className="tc-chips">
                      <span className="tc-chip">ID: {t.pelanggan.kodePelanggan}</span>
                      {t.pelanggan.kelurahan?.nama && (
                        <span className="tc-chip">Kel. {t.pelanggan.kelurahan.nama}</span>
                      )}
                      <span className="tc-chip">{LABEL_KATEGORI[t.pelanggan.kategori] || t.pelanggan.kategori}</span>
                    </div>
                  </div>

                  <div className="tc-due">
                    <span className="tc-label">Jatuh Tempo:</span>
                    <h2 className="tc-due-date">{formatTanggalIndo(t.jatuhTempo)}</h2>
                    <span className="tc-due-periode">Periode: <b>{periode}</b></span>
                  </div>
                </div>

                {/* Tabel Rincian */}
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60%" }}>Uraian Komponen Retribusi</th>
                      <th style={{ width: "20%" }}>Periode</th>
                      <th style={{ width: "20%" }} className="ta-r">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>{t.keterangan || `Jasa Angkut & Pengolahan Sampah Lingkungan`}</strong>
                        <div className="tc-item-sub">Iuran retribusi pelayanan persampahan terpadu TPS 3R</div>
                      </td>
                      <td className="font-mono">{periode}</td>
                      <td className="ta-r font-mono">{formatRupiahSkylite(rincian.base)}</td>
                    </tr>
                    <tr>
                      <td>
                        <span>Pajak Pertambahan Nilai (PPN {PPN_RATE}%)</span>
                        <div className="tc-item-sub">Sesuai UU Harmonisasi Peraturan Perpajakan</div>
                      </td>
                      <td className="font-mono">{periode}</td>
                      <td className="ta-r font-mono">{formatRupiahSkylite(rincian.ppn)}</td>
                    </tr>
                    {rincian.denda ? (
                      <tr className="tc-row-denda">
                        <td>
                          <strong>Denda / Sanksi Keterlambatan</strong>
                          <div className="tc-item-sub">Kompensasi administrasi tunggakan</div>
                        </td>
                        <td className="font-mono">{periode}</td>
                        <td className="ta-r font-mono text-rose-700">{formatRupiahSkylite(rincian.denda)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>

                {/* Terbilang & Total */}
                <div className="tc-total-wrap">
                  <div className="tc-terbilang">
                    <span className="tc-terbilang-k">Terbilang:</span>
                    <p className="tc-terbilang-v">&ldquo;{terbilangRupiah(rincian.total)}&rdquo;</p>
                  </div>
                  <div className="tc-total">
                    <span>TOTAL RETRIBUSI</span>
                    <strong>{formatRupiahSkylite(rincian.total)}</strong>
                  </div>
                </div>

                {/* Footer Status & QR Validation */}
                <div className={`tc-foot ${lunas ? "tc-foot-lunas" : "tc-foot-belum"}`}>
                  <div className="tc-foot-info">
                    {lunas ? (
                      <>
                        <div className="tc-foot-status-text">
                          Status: <b className="text-emerald-700">LUNAS / TERVERIFIKASI</b>
                        </div>
                        {pembayaran && (
                          <div className="tc-meta">
                            Dibayar via <b>{pembayaran.metode.toUpperCase()}</b> pada {formatTanggalIndo(pembayaran.createdAt)}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="tc-foot-status-text">
                          Status: <b className="text-amber-800">BELUM DIBAYAR</b>
                        </div>
                        <div className="tc-meta">
                          Selesaikan pembayaran sebelum {formatTanggalIndo(t.jatuhTempo)} via QRIS atau Petugas.
                        </div>
                      </>
                    )}
                    <div className="tc-small-note">
                      Dokumen retribusi resmi TPS HERU Kota Depok #{idx + 1}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="tc-qr-area">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} width={68} height={68} alt="QR Verifikasi" className="tc-qr-img" />
                    <span className="tc-qr-label">Pindai Verifikasi</span>
                  </div>

                  <div className="tc-terima">
                    <span>Petugas / Kasir,</span>
                    <div className="tc-sign-space" />
                    <span className="tc-sign-name">( TPS HERU DEPOK )</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

