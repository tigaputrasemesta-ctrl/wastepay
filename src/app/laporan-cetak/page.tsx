import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
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
 * /laporan-cetak?bulan=&tahun= — Laporan bulanan printable (PDF via window.print).
 * Hanya pengguna login (admin/kasir).
 */
export default async function LaporanCetakPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

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
  const efektivitas = data.totalTagihan > 0
    ? Math.round((data.tagihanTerkumpul / data.totalTagihan) * 100)
    : 0;

  return (
    <div className="lp-page-bg">
      <div className="lp-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="lp-toolbar">
          <div className="lp-toolbar-title">
            Laporan {periode}
          </div>
          <div className="lp-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href={`/laporan?bulan=${bulan}&tahun=${tahun}`} className="lp-toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        {/* Lembar laporan */}
        <div className="lp-sheet">
          {/* Kepala */}
          <div className="lp-head">
            <div>
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat} · {perusahaan.whatsapp} · {perusahaan.email}</p>
            </div>
            <div className="lp-head-title">
              <h2>LAPORAN KEUANGAN &amp; OPERASIONAL</h2>
              <p>Periode {periode}</p>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="lp-kpi">
            <div className="lp-kpi-box">
              <span>Pemasukan</span>
              <p className="lp-green">{formatRupiah(data.totalPemasukan)}</p>
            </div>
            <div className="lp-kpi-box">
              <span>Pengeluaran</span>
              <p className="lp-red">{formatRupiah(data.totalPengeluaran)}</p>
            </div>
            <div className="lp-kpi-box">
              <span>Saldo Bersih</span>
              <p className={data.saldo >= 0 ? "lp-green" : "lp-red"}>
                {formatRupiah(data.saldo)}
              </p>
            </div>
            <div className="lp-kpi-box">
              <span>Efektivitas Tagihan</span>
              <p>{efektivitas}%</p>
            </div>
          </div>

          {/* Dua kolom: tagihan & pengeluaran */}
          <div className="lp-cols">
            <div className="lp-section">
              <h3>Tagihan Bulan Ini</h3>
              <div className="lp-row"><span>Total Tagihan</span><p>{formatRupiah(data.totalTagihan)}</p></div>
              <div className="lp-row"><span>Terkumpul</span><p className="lp-green">{formatRupiah(data.tagihanTerkumpul)}</p></div>
              <div className="lp-row"><span>Sisa Tagihan</span><p className="lp-red">{formatRupiah(data.tagihanSisa)}</p></div>
              <div className="lp-row"><span>Pelanggan Aktif</span><p>{data.totalPelanggan}</p></div>
              <div className="lp-row"><span>Belum Bayar</span><p>{data.totalBelumBayar}</p></div>
            </div>
            <div className="lp-section">
              <h3>Pengeluaran per Kategori</h3>
              {data.pengeluaranByKategori.length === 0 ? (
                <p className="lp-empty">Tidak ada pengeluaran bulan ini</p>
              ) : (
                <>
                  {data.pengeluaranByKategori.map((k) => (
                    <div className="lp-row" key={k.kategori}>
                      <span>{labelKategoriPengeluaran(k.kategori)}</span>
                      <p className="lp-red">{formatRupiah(k._sum.jumlah || 0)}</p>
                    </div>
                  ))}
                  <div className="lp-row lp-total-row">
                    <span>Total</span>
                    <p className="lp-red">{formatRupiah(data.totalPengeluaran)}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Data lingkungan */}
          <div className="lp-section">
            <h3>Data Lingkungan</h3>
            <div className="lp-kpi lp-kpi-small">
              <div className="lp-kpi-box">
                <span>Volume Sampah</span>
                <p>{data.totalVolume.toFixed(1)} m³</p>
              </div>
              <div className="lp-kpi-box">
                <span>Berat Sampah</span>
                <p>{data.totalBerat.toFixed(1)} kg</p>
              </div>
              <div className="lp-kpi-box">
                <span>Total Angkut</span>
                <p>{data.totalPengangkutan}</p>
              </div>
              <div className="lp-kpi-box">
                <span>Berhasil Diangkut</span>
                <p className="lp-green">{data.totalDiambil}</p>
              </div>
            </div>
          </div>

          {/* Sampah per jenis & TPA */}
          {(data.sampahByJenis.length > 0 || data.sampahByTpa.length > 0) && (
            <div className="lp-cols">
              {data.sampahByJenis.length > 0 && (
                <div className="lp-section">
                  <h3>Sampah per Jenis</h3>
                  {data.sampahByJenis.map((j) => (
                    <div className="lp-row" key={j.jenisSampah}>
                      <span>{labelJenisSampah(j.jenisSampah || "")}</span>
                      <p>
                        {j._sum.volume?.toFixed(1) ?? "0.0"} m³ · {j._sum.berat?.toFixed(1) ?? "0.0"} kg
                        <span className="lp-sub"> · {j._count}x angkut</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {data.sampahByTpa.length > 0 && (
                <div className="lp-section">
                  <h3>Pembuangan per TPA</h3>
                  <table className="lp-table">
                    <thead>
                      <tr>
                        <th>TPA</th>
                        <th className="ta-r">Vol (m³)</th>
                        <th className="ta-r">Berat (kg)</th>
                        <th className="ta-r">Frekuensi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sampahByTpa.map((s) => (
                        <tr key={s.tpaId}>
                          <td>{s.nama}</td>
                          <td className="ta-r">{s.volume.toFixed(1)}</td>
                          <td className="ta-r">{s.berat.toFixed(1)}</td>
                          <td className="ta-r">{s.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tagihan menunggak */}
          <div className="lp-section">
            <h3>Tagihan Menunggak</h3>
            {data.tagihanMenunggak.length === 0 ? (
              <p className="lp-empty">Tidak ada tagihan menunggak</p>
            ) : (
              <table className="lp-table">
                <thead>
                  <tr>
                    <th>Pelanggan</th>
                    <th>No. Telepon</th>
                    <th>Periode</th>
                    <th className="ta-r">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tagihanMenunggak.map((t) => (
                    <tr key={t.id}>
                      <td>{t.pelanggan.nama}</td>
                      <td>{t.pelanggan.noTelepon}</td>
                      <td>{NAMA_BULAN[t.bulan - 1]} {t.tahun}</td>
                      <td className="ta-r lp-red">{formatRupiah(t.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Tanda tangan */}
          <div className="lp-sign">
            <div className="lp-sign-box">
              <p>Dibuat oleh,</p>
              <div className="lp-sign-space" />
              <p className="lp-sign-name">({session.nama})</p>
            </div>
            <div className="lp-sign-box">
              <p>Mengetahui,</p>
              <div className="lp-sign-space" />
              <p className="lp-sign-name">(................)</p>
            </div>
          </div>

          {/* Footer */}
          <div className="lp-foot">
            Dokumen di-generate pada {formatDate(new Date())} · {perusahaan.nama}
          </div>
        </div>
      </div>
    </div>
  );
}
