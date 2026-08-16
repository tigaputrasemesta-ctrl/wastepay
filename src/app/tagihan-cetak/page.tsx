import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import {
  getTagihanMassal,
  hitungRincian,
  formatRupiahSkylite,
  formatTanggalIndo,
  BULAN_INDO,
  PPN_RATE,
  companyInfo,
} from "@/lib/invoice";
import TombolCetak from "@/components/TombolCetak";
import "./tagihan-cetak.css";

const LABEL_KATEGORI: Record<string, string> = {
  rumah_tangga: "Rumah Tangga",
  bisnis: "Bisnis",
  kost: "Kost",
  sekolah: "Sekolah",
  rm_makan: "Rumah Makan",
  perkantoran: "Perkantoran",
  industri: "Industri",
  lainnya: "Lainnya",
};

/**
 * /tagihan-cetak?bulan=&tahun= — Cetak massal tagihan satu periode (PDF via window.print).
 * Satu tagihan = satu halaman A4 (break-after: page) untuk didistribusikan ke pelanggan.
 * Petugas dibatasi scope kelurahan (nonaktif sementara — PETUGAS_SCOPE_ALL).
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

  // Scope kelurahan untuk petugas (anti-enumerasi via query)
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

  return (
    <div className="tc-page-bg">
      <div className="tc-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="tc-toolbar">
          <div className="tc-toolbar-title">
            Cetak Massal Tagihan — {periode} · {tagihan.length} tagihan
          </div>
          <div className="tc-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href={`/tagihan?bulan=${bulan}&tahun=${tahun}`} className="tc-toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        {tagihan.length === 0 ? (
          <div className="tc-empty">
            <h1>Tidak ada tagihan</h1>
            <p>Tidak ditemukan tagihan untuk periode {periode}.</p>
          </div>
        ) : (
          tagihan.map((t) => {
            const rincian = hitungRincian(t.jumlah, t.denda);
            const lunas = t.status === "lunas";
            const pembayaran = t.pembayaran[0];
            const alamatLengkap = [
              t.pelanggan.alamat,
              t.pelanggan.rtRw ? `RT/RW ${t.pelanggan.rtRw}` : null,
              t.pelanggan.patokanLokasi ? `Patokan: ${t.pelanggan.patokanLokasi}` : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div className="tc-invoice" key={t.id}>
                {/* Kepala */}
                <div className="tc-head">
                  <div className="tc-logo-box">O2W</div>
                  <div className="tc-company">
                    <h1>{perusahaan.nama}</h1>
                    <p>{perusahaan.alamat} · WA {perusahaan.whatsapp}</p>
                  </div>
                  <div className="tc-invoice-no">
                    <span>Nomor Invoice</span>
                    <strong>{t.noInvoice || "-"}</strong>
                    <span className="tc-status">{lunas ? "LUNAS" : "BELUM BAYAR"}</span>
                  </div>
                </div>

                {/* Pelanggan */}
                <div className="tc-customer">
                  <div className="tc-party">
                    <span>Ditujukan Kepada</span>
                    <h2>{t.pelanggan.nama}</h2>
                    <p>{alamatLengkap}</p>
                    <p>
                      {t.pelanggan.kelurahan?.nama ? `Kelurahan ${t.pelanggan.kelurahan.nama} · ` : ""}
                      ID {t.pelanggan.kodePelanggan} · {LABEL_KATEGORI[t.pelanggan.kategori] || t.pelanggan.kategori}
                    </p>
                  </div>
                  <div className="tc-due">
                    <span>Jatuh Tempo</span>
                    <h2>{formatTanggalIndo(t.jatuhTempo)}</h2>
                  </div>
                </div>

                {/* Rincian */}
                <table className="tc-table">
                  <thead>
                    <tr>
                      <th>Keterangan</th>
                      <th className="ta-r">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t.keterangan || `Iuran sampah ${periode}`}</td>
                      <td className="ta-r">{formatRupiahSkylite(rincian.base)}</td>
                    </tr>
                    <tr>
                      <td>PPN ({PPN_RATE}%)</td>
                      <td className="ta-r">{formatRupiahSkylite(rincian.ppn)}</td>
                    </tr>
                    {rincian.denda ? (
                      <tr>
                        <td>Denda keterlambatan</td>
                        <td className="ta-r">{formatRupiahSkylite(rincian.denda)}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>

                {/* Total */}
                <div className="tc-total">
                  <span>TOTAL TAGIHAN</span>
                  <strong>{formatRupiahSkylite(rincian.total)}</strong>
                </div>

                {/* Status */}
                <div className={`tc-foot ${lunas ? "tc-lunas" : "tc-belum"}`}>
                  <div>
                    {lunas ? (
                      <>
                        <span>Status: <b>LUNAS</b></span>
                        {pembayaran && (
                          <span className="tc-meta">
                            Dibayar via {pembayaran.metode.toUpperCase()} pada {formatTanggalIndo(pembayaran.createdAt)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>
                        Status: <b>BELUM DIBAYAR</b> — selesaikan sebelum {formatTanggalIndo(t.jatuhTempo)}
                      </span>
                    )}
                  </div>
                  <div className="tc-terima">
                    <span>Diterima oleh,</span>
                    <div className="tc-sign-space" />
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
