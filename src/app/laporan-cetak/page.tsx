import Link from "next/link";
import { requirePageRole } from "@/lib/server-rbac";
import {
  getLaporan,
  labelKategoriPengeluaran,
  labelJenisSampah,
} from "@/lib/laporan";
import TombolCetak from "@/components/TombolCetak";
import { formatRupiah, formatDate } from "@/lib/utils";
import { companyInfo } from "@/lib/invoice-format";
import "./laporan-cetak.css";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * /laporan-cetak?bulan=&tahun= — Laporan bulanan resmi berstandar eksekutif & audit (PDF via window.print).
 * Hanya pengguna login (admin/kasir/superadmin).
 */
export default async function LaporanCetakPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>;
}) {
  const session = await requirePageRole("kasir");

  const params = await searchParams;
  const now = new Date();
  const bulan = Math.min(
    12,
    Math.max(1, parseInt(params.bulan || String(now.getMonth() + 1)) || now.getMonth() + 1)
  );
  const tahun = parseInt(params.tahun || String(now.getFullYear())) || now.getFullYear();

  const data = await getLaporan(bulan, tahun);
  const perusahaan = companyInfo();
  const periode = `${NAMA_BULAN[bulan - 1]} ${tahun}`;

  return (
    <div className="lp-page-bg">
      <div className="lp-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="lp-toolbar">
          <div className="lp-toolbar-title">
            Laporan Keuangan &amp; Operasional — {periode}
          </div>
          <div className="lp-toolbar-actions">
            <TombolCetak label="🖨 Cetak / Unduh Dokumen PDF" />
            <Link href={`/laporan?bulan=${bulan}&tahun=${tahun}`} className="lp-toolbar-link">
              &larr; Kembali ke Dashboard
            </Link>
          </div>
        </div>

        {/* Lembar laporan resmi */}
        <div className="lp-sheet">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* HALAMAN 1: KINERJA FINANSIAL & ARUS KAS (PSAK 72)                  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="lp-head">
            <div>
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat} · WhatsApp: {perusahaan.whatsapp} · Email: {perusahaan.email}</p>
              <p style={{ marginTop: "3px", fontSize: "8.5px", color: "#a5a9a0" }}>
                Izin Operasional Pengelolaan Sampah Mandiri &amp; TPS 3R Kota Depok
              </p>
            </div>
            <div className="lp-head-title">
              <h2>LAPORAN KEUANGAN BULANAN</h2>
              <p>Periode {periode}</p>
              <p style={{ fontSize: "8px", color: "#a5a9a0", textTransform: "none" }}>
                Standar Akuntansi Keuangan PSAK 72 &amp; PSAK 71
              </p>
            </div>
          </div>

          {/* Ringkasan Eksekutif KPI */}
          <div className="lp-kpi">
            <div className="lp-kpi-box">
              <span>Earned Revenue (PSAK 72)</span>
              <p className="lp-green">{formatRupiah(data.kpi.earnedAccrualRevenue)}</p>
              <span className="lp-sub">Tagihan Terbit: {formatRupiah(data.kpi.grossBilledCurrent)}</span>
            </div>
            <div className="lp-kpi-box">
              <span>Realisasi Kas Masuk</span>
              <p style={{ color: "#0369a1" }}>{formatRupiah(data.kpi.totalRealizedCash)}</p>
              <span className="lp-sub">Likuiditas Kas Riil</span>
            </div>
            <div className="lp-kpi-box">
              <span>Beban Kas Operasional</span>
              <p className="lp-red">{formatRupiah(data.kpi.totalPengeluaran)}</p>
              <span className="lp-sub">BBM, Gaji, Perawatan</span>
            </div>
            <div className="lp-kpi-box">
              <span>Surplus Operasional</span>
              <p className={data.kpi.accrualOperatingProfit >= 0 ? "lp-green" : "lp-red"}>
                {formatRupiah(data.kpi.accrualOperatingProfit)}
              </p>
              <span className="lp-sub">Margin: {data.kpi.accrualMarginPersen.toFixed(1)}%</span>
            </div>
          </div>

          {/* Indikator Penagihan & Kolektibilitas */}
          <div className="lp-cols" style={{ marginTop: "6px" }}>
            <div className="lp-section">
              <h3>Kinerja Penagihan &amp; Likuiditas</h3>
              <div className="lp-row">
                <span>Gross Collection Rate (GCR)</span>
                <p className="lp-green">{data.kpi.grossCollectionRate.toFixed(1)}%</p>
              </div>
              <div className="lp-row">
                <span>Days Sales Outstanding (DSO)</span>
                <p>{data.kpi.dsoHari} Hari</p>
              </div>
              <div className="lp-row">
                <span>Kas Tagihan Periode Ini</span>
                <p className="lp-green">{formatRupiah(data.bridge.currentBilledCollected)}</p>
              </div>
              <div className="lp-row">
                <span>Piutang Berjalan Belum Terbayar</span>
                <p className="lp-red">{formatRupiah(data.bridge.accruedUncollected)}</p>
              </div>
            </div>

            <div className="lp-section">
              <h3>Realisasi Kas per Kanal</h3>
              {data.pemasukanByMetode.map((m) => {
                let label = m.metode;
                if (m.metode.startsWith("duitku") || ["qris", "ewallet", "virtual_account"].includes(m.metode)) {
                  label = "Payment Gateway Duitku (QRIS/VA)";
                } else if (m.metode === "transfer") {
                  label = "Transfer Bank Manual";
                } else if (m.metode === "tunai") {
                  label = "Kas Tunai (Petugas/Kasir)";
                }
                return (
                  <div className="lp-row" key={m.metode}>
                    <span style={{ textTransform: "capitalize" }}>{label}</span>
                    <p className="lp-green">{formatRupiah(m.jumlah)}</p>
                  </div>
                );
              })}
              <div className="lp-row lp-total-row">
                <span>Total Realisasi Kas Masuk</span>
                <p className="lp-green">{formatRupiah(data.totalPemasukan)}</p>
              </div>
            </div>
          </div>

          {/* Jembatan Rekonsiliasi Arus Kas ke Akrual */}
          <div className="lp-section" style={{ marginTop: "8px" }}>
            <h3>Jembatan Rekonsiliasi Arus Kas ke Pendapatan Operasional (PSAK 72 Bridge)</h3>
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Komponen Akuntansi Arus Kas vs Akrual</th>
                  <th>Keterangan Standar Akuntansi</th>
                  <th className="ta-r">Nominal (Rp)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>[+] Total Realisasi Kas Masuk (Cash Inflow)</b></td>
                  <td>Seluruh penerimaan fisik dan bank terverifikasi bulan ini</td>
                  <td className="ta-r"><b>{formatRupiah(data.bridge.realizedCashInflow)}</b></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: "16px" }}>&bull; Dari Tagihan Periode Berjalan</td>
                  <td>Kas masuk atas hak layanan bulan {periode}</td>
                  <td className="ta-r">{formatRupiah(data.bridge.currentBilledCollected)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: "16px" }}>&bull; Dari Pelunasan Piutang Bulan Lalu</td>
                  <td>Kas masuk atas tunggakan bulan-bulan sebelumnya (Recovery)</td>
                  <td className="ta-r">{formatRupiah(data.bridge.pastArrearsCollected)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: "16px" }}>&bull; Titipan Pembayaran di Muka (Deferred Revenue)</td>
                  <td>Dieliminasi: kas masuk untuk tagihan periode masa depan</td>
                  <td className="ta-r lp-red">- {formatRupiah(data.bridge.prepaidFutureCollected)}</td>
                </tr>
                <tr>
                  <td><b>[=] Kas Masuk yang Menjadi Hak Periode Ini</b></td>
                  <td>Arus kas masuk yang telah sah terealisasi</td>
                  <td className="ta-r"><b>{formatRupiah(data.bridge.currentBilledCollected)}</b></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: "16px" }}>[+] Tagihan Bulan Ini yg Dilunasi di Muka (Recognized)</td>
                  <td>Kas masuk bulan lalu yang jasanya ditunaikan bulan ini</td>
                  <td className="ta-r lp-green">+ {formatRupiah(data.bridge.prepaidPastRecognized)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: "16px" }}>[+] Piutang Berjalan yg Belum Terbayar (Accrued)</td>
                  <td>Jasa angkut telah ditunaikan, hak pendapatan diakui</td>
                  <td className="ta-r">+ {formatRupiah(data.bridge.accruedUncollected)}</td>
                </tr>
                <tr style={{ background: "#e2e8f0", fontWeight: "bold" }}>
                  <td><b>[=] PENDAPATAN OPERASIONAL SEJATI (EARNED REVENUE)</b></td>
                  <td>Hak pendapatan akrual murni sesuai PSAK 72</td>
                  <td className="ta-r lp-green"><b>{formatRupiah(data.bridge.earnedAccrualRevenue)}</b></td>
                </tr>
                <tr>
                  <td>[-] Total Beban Operasional Kas</td>
                  <td>BBM armada, upah kru, perawatan, dan tipping fee TPA</td>
                  <td className="ta-r lp-red">- {formatRupiah(data.bridge.accrualOperatingExpenses)}</td>
                </tr>
                <tr style={{ background: "#17191d", color: "#b7e13c", fontWeight: "bold" }}>
                  <td style={{ color: "#ffffff" }}><b>[=] SURPLUS LABA OPERASIONAL BERSIH</b></td>
                  <td style={{ color: "#cbd5e1" }}>Margin Bersih: {data.bridge.accrualMarginPersen.toFixed(1)}%</td>
                  <td className="ta-r" style={{ color: "#b7e13c" }}><b>{formatRupiah(data.bridge.accrualOperatingProfit)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* HALAMAN 2: LOGISTIK SAMPAH, UNIT ECONOMICS & TPA                   */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="page-break" style={{ height: "16px" }} />

          <div className="lp-section" style={{ paddingTop: "14px" }}>
            <h3>Data Lingkungan, Logistik Persampahan &amp; Unit Economics</h3>
            
            <div className="lp-kpi lp-kpi-small" style={{ padding: "8px 0 12px" }}>
              <div className="lp-kpi-box">
                <span>Total Tonase Sampah</span>
                <p>{(data.totalBerat / 1000).toFixed(2)} Ton</p>
                <span className="lp-sub">Volume: {data.totalVolume.toFixed(1)} m³</span>
              </div>
              <div className="lp-kpi-box">
                <span>Ritase Armada</span>
                <p>{data.unitEconomics.totalRitase} Trip</p>
                <span className="lp-sub">Rata-rata: {data.unitEconomics.muatanPerRitaseTon.toFixed(2)} Ton/Trip</span>
              </div>
              <div className="lp-kpi-box">
                <span>Biaya per Tonase</span>
                <p className="lp-red">{formatRupiah(Math.round(data.unitEconomics.totalCostPerTon))}</p>
                <span className="lp-sub">Revenue: {formatRupiah(Math.round(data.unitEconomics.revenuePerTon))}/Ton</span>
              </div>
              <div className="lp-kpi-box">
                <span>Biaya per Ritase</span>
                <p>{formatRupiah(Math.round(data.unitEconomics.totalRitase > 0 ? data.totalPengeluaran / data.unitEconomics.totalRitase : 0))}</p>
                <span className="lp-sub">Ongkos 1 Kali Angkut</span>
              </div>
            </div>

            <div className="lp-cols" style={{ padding: "0" }}>
              <div className="lp-section" style={{ padding: "0 10px 0 0" }}>
                <h3 style={{ fontSize: "10px" }}>Pembuangan Akhir per TPA</h3>
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>TPA</th>
                      <th className="ta-r">Volume (m³)</th>
                      <th className="ta-r">Berat (kg)</th>
                      <th className="ta-r">Ritase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sampahByTpa.map((s) => (
                      <tr key={s.tpaId}>
                        <td>{s.nama}</td>
                        <td className="ta-r">{s.volume.toFixed(1)}</td>
                        <td className="ta-r">{s.berat.toFixed(0)}</td>
                        <td className="ta-r">{s.count} trip</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lp-section" style={{ padding: "0 0 0 10px" }}>
                <h3 style={{ fontSize: "10px" }}>Komposisi Jenis Sampah</h3>
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>Jenis Sampah</th>
                      <th className="ta-r">Volume (m³)</th>
                      <th className="ta-r">Berat (kg)</th>
                      <th className="ta-r">Frekuensi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sampahByJenis.map((j) => (
                      <tr key={j.jenisSampah}>
                        <td>{labelJenisSampah(j.jenisSampah || "")}</td>
                        <td className="ta-r">{j._sum.volume?.toFixed(1) || 0}</td>
                        <td className="ta-r">{j._sum.berat?.toFixed(0) || 0}</td>
                        <td className="ta-r">{j._count} kali</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* HALAMAN 3: AGING SCHEDULE PIUTANG (PSAK 71) & PENGESAHAN           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="page-break" style={{ height: "16px" }} />

          <div className="lp-section" style={{ paddingTop: "14px" }}>
            <h3>Jadwal Umur Piutang (Aging Schedule) &amp; Cadangan Penurunan Nilai (PSAK 71)</h3>
            <p className="lp-sub" style={{ margin: "2px 0 8px" }}>
              Total Portofolio Piutang: <b>{formatRupiah(data.agingSchedule.totalPiutangGross)}</b> ({data.agingSchedule.totalDebiturUnik} Debitur) · Cadangan CKPN: <b>- {formatRupiah(data.agingSchedule.totalNilaiCkpn)}</b> · Nilai Bersih: <b>{formatRupiah(data.agingSchedule.netCarryingValuePiutang)}</b>
            </p>

            <table className="lp-table">
              <thead>
                <tr>
                  <th>Jenjang Kolektibilitas</th>
                  <th>Rentang Umur</th>
                  <th className="ta-r">Jml Tagihan</th>
                  <th className="ta-r">Debitur</th>
                  <th className="ta-r">Saldo Piutang (Rp)</th>
                  <th className="ta-r">% CKPN</th>
                  <th className="ta-r">Cadangan CKPN (Rp)</th>
                </tr>
              </thead>
              <tbody>
                {data.agingSchedule.buckets.map((b) => (
                  <tr key={b.kategori}>
                    <td><b>{b.label}</b></td>
                    <td>{b.rentangHari}</td>
                    <td className="ta-r">{b.jumlahTagihan}</td>
                    <td className="ta-r">{b.jumlahPelanggan} KK</td>
                    <td className="ta-r"><b>{formatRupiah(b.totalNominal)}</b></td>
                    <td className="ta-r">{b.persenCkpn}%</td>
                    <td className="ta-r lp-red">{formatRupiah(b.nilaiCkpn)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#e2e8f0", fontWeight: "bold" }}>
                  <td colSpan={4}>TOTAL PORTOFOLIO &amp; CADANGAN PENURUNAN NILAI</td>
                  <td className="ta-r">{formatRupiah(data.agingSchedule.totalPiutangGross)}</td>
                  <td className="ta-r">-</td>
                  <td className="ta-r lp-red">{formatRupiah(data.agingSchedule.totalNilaiCkpn)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Lembar Otorisasi & Pengesahan Bertingkat */}
          <div className="lp-section" style={{ marginTop: "14px" }}>
            <h3>Lembar Otorisasi &amp; Pengesahan Dokumen</h3>
            <div className="lp-sign-3">
              <div className="lp-sign-box">
                <p>Disiapkan Oleh,</p>
                <div className="lp-sign-space" />
                <p className="lp-sign-name">({session.nama})</p>
                <p style={{ fontSize: "8.5px", color: "#6b6e66" }}>Petugas Keuangan / Kasir</p>
              </div>
              <div className="lp-sign-box">
                <p>Diperiksa Oleh,</p>
                <div className="lp-sign-space" />
                <p className="lp-sign-name">( Ir. Bambang S., M.Ak. )</p>
                <p style={{ fontSize: "8.5px", color: "#6b6e66" }}>Fractional CFO / Internal Auditor</p>
              </div>
              <div className="lp-sign-box">
                <p>Disetujui Oleh,</p>
                <div className="lp-sign-space" />
                <p className="lp-sign-name">( Heru Pratama )</p>
                <p style={{ fontSize: "8.5px", color: "#6b6e66" }}>Direktur Utama UPS HERU Depok</p>
              </div>
            </div>
          </div>

          {/* Footer Dokumen */}
          <div className="lp-foot">
            Dokumen resmi ini di-generate pada {formatDate(new Date())} melalui Sistem Billing WastePay · Sah sebagai Laporan Pertanggungjawaban RUPS &amp; Dinas Lingkungan Hidup Kota Depok
          </div>
        </div>
      </div>
    </div>
  );
}
