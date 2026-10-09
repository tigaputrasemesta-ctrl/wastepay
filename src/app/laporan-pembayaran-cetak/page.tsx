import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TombolCetak from "@/components/TombolCetak";
import { formatRupiah, formatDate } from "@/lib/utils";
import { companyInfo } from "@/lib/invoice-format";
import "../laporan-cetak/laporan-cetak.css";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function LaporanPembayaranCetakPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tahun?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  
  const filterBulan = params.bulan && params.bulan !== "all" 
    ? parseInt(params.bulan) 
    : (params.bulan === "all" ? null : now.getMonth() + 1);
    
  const tahun = parseInt(params.tahun || String(now.getFullYear())) || now.getFullYear();
  const filterStatus = params.status || "all";

  // Build query
  const whereClause: any = {
    tahun,
    deletedAt: null,
  };
  
  if (filterBulan !== null) {
    whereClause.bulan = filterBulan;
  }
  
  if (filterStatus !== "all") {
    if (filterStatus === "lunas") {
      whereClause.status = "lunas";
    } else if (filterStatus === "belum_bayar") {
      whereClause.status = { in: ["belum_bayar", "tunggakan"] };
    }
  }

  const tagihanList = await prisma.tagihan.findMany({
    where: whereClause,
    include: {
      pelanggan: {
        select: {
          kodePelanggan: true,
          nama: true,
          alamat: true,
        },
      },
      pembayaran: {
        orderBy: { createdAt: "desc" },
        take: 1, // Ambil pembayaran terakhir
      },
    },
    orderBy: [
      { pelanggan: { kodePelanggan: "asc" } },
      { bulan: "asc" },
    ],
  });

  const perusahaan = companyInfo();
  const periode = filterBulan === null 
    ? `Tahun ${tahun}` 
    : `${NAMA_BULAN[filterBulan - 1]} ${tahun}`;

  let totalTagihan = 0;
  let totalDenda = 0;
  let totalTerbayar = 0;

  tagihanList.forEach((t) => {
    totalTagihan += t.jumlah;
    if (t.denda) totalDenda += t.denda;
    if (t.status === "lunas" && t.pembayaran.length > 0) {
      totalTerbayar += t.pembayaran[0].jumlah;
    }
  });

  // Helper untuk format tanggal
  const formatTanggalSingkat = (dateInput: Date | string | null) => {
    if (!dateInput) return "-";
    const d = new Date(dateInput);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const labelMetode = (metode: string | undefined) => {
    if (!metode) return "-";
    if (metode.startsWith("duitku")) return "Payment Gateway";
    const map: Record<string, string> = {
      tunai: "Tunai",
      transfer: "Transfer",
      ewallet: "E-Wallet",
      qris: "QRIS",
      virtual_account: "Virtual Account"
    };
    return map[metode] || metode;
  };

  return (
    <div className="lp-page-bg">
      <div className="lp-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="lp-toolbar">
          <div className="lp-toolbar-title">
            Laporan Tagihan & Pembayaran per Pelanggan
          </div>
          <div className="lp-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <a 
              href={`/api/laporan/pembayaran/export?bulan=${params.bulan || ''}&tahun=${tahun}&status=${filterStatus}`}
              className="print-btn" 
              style={{ backgroundColor: '#fff', color: '#13150a' }}
            >
              Ekspor Excel (CSV)
            </a>
            <button 
              onClick={() => window.close()} 
              className="lp-toolbar-link" 
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Tutup Tab
            </button>
          </div>
        </div>

        {/* Lembar laporan */}
        <div className="lp-sheet">
          {/* Kepala */}
          <div className="lp-head">
            <div>
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat} · {perusahaan.whatsapp}</p>
            </div>
            <div className="lp-head-title">
              <h2>LAPORAN PEMBAYARAN PELANGGAN</h2>
              <p>Periode {periode}</p>
            </div>
          </div>

          <div className="lp-section" style={{ marginTop: '10px' }}>
            <div className="lp-kpi lp-kpi-small">
              <div className="lp-kpi-box">
                <span>Total Pelanggan Ditagih</span>
                <p>{tagihanList.length} Org</p>
              </div>
              <div className="lp-kpi-box">
                <span>Nominal Tagihan (Tanpa Denda)</span>
                <p>{formatRupiah(totalTagihan)}</p>
              </div>
              <div className="lp-kpi-box">
                <span>Total Lunas Terbayar</span>
                <p className="lp-green">{formatRupiah(totalTerbayar)}</p>
              </div>
            </div>
          </div>

          {/* Tabel Data */}
          <div className="lp-section">
            <table className="lp-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>No</th>
                  <th>No Pelanggan</th>
                  <th>Nama Pelanggan</th>
                  <th>Bulan Tagihan</th>
                  <th className="ta-r">Nominal (Rp)</th>
                  <th className="ta-r">Denda (Rp)</th>
                  <th>Status</th>
                  <th>Tgl Bayar</th>
                  <th>Metode</th>
                </tr>
              </thead>
              <tbody>
                {tagihanList.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#6b6e66' }}>
                      Tidak ada data tagihan untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  tagihanList.map((t, idx) => {
                    const lunas = t.status === "lunas";
                    const p = t.pembayaran.length > 0 ? t.pembayaran[0] : null;
                    return (
                      <tr key={t.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontFamily: 'monospace' }}>{t.pelanggan.kodePelanggan}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.pelanggan.nama}</div>
                        </td>
                        <td>{NAMA_BULAN[t.bulan - 1]} {t.tahun}</td>
                        <td className="ta-r">{t.jumlah.toLocaleString("id-ID")}</td>
                        <td className="ta-r">{t.denda ? t.denda.toLocaleString("id-ID") : "-"}</td>
                        <td>
                          {lunas ? (
                            <span style={{ color: '#1a7a34', fontWeight: 600 }}>LUNAS</span>
                          ) : (
                            <span style={{ color: '#b31220', fontWeight: 600 }}>
                              {t.status === "tunggakan" ? "TUNGGAKAN" : "BELUM BAYAR"}
                            </span>
                          )}
                        </td>
                        <td>{lunas && p ? formatTanggalSingkat(p.createdAt) : "-"}</td>
                        <td>{lunas && p ? labelMetode(p.metode) : "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Tanda tangan */}
          <div className="lp-sign">
            <div className="lp-sign-box">
              <p>Dibuat oleh,</p>
              <div className="lp-sign-space" />
              <p className="lp-sign-name">({session.nama})</p>
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
