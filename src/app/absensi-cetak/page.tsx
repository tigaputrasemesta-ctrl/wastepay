import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRekapAbsensi } from "@/lib/absensi";
import TombolCetak from "@/components/TombolCetak";
import { BULAN_INDO, companyInfo, formatTanggalWaktuIndo } from "@/lib/invoice-format";
import "./absensi-cetak.css";

const BULAN_SINGKAT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const STATUS_LABEL: Record<string, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Alpa",
};

function formatJam(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function durasiJam(masuk: Date, selesai: Date | null): string {
  if (!selesai) return "-";
  const ms = selesai.getTime() - masuk.getTime();
  const jam = ms / (1000 * 60 * 60);
  return `${jam.toFixed(1)} jam`;
}

type RekapRow = Awaited<ReturnType<typeof getRekapAbsensi>>[number];

/**
 * /absensi-cetak?bulan=&tahun= — Rekap absensi petugas bulanan (printable via window.print).
 */
export default async function AbsensiCetakPage({
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

  const rows = await getRekapAbsensi(bulan, tahun);
  const perusahaan = companyInfo();
  const periode = `${BULAN_INDO[bulan - 1]} ${tahun}`;

  // Grup per petugas
  const byPetugas = new Map<number, { petugas: RekapRow["petugas"]; rows: RekapRow[] }>();
  for (const r of rows) {
    if (!byPetugas.has(r.petugas.id)) {
      byPetugas.set(r.petugas.id, { petugas: r.petugas, rows: [] });
    }
    byPetugas.get(r.petugas.id)!.rows.push(r);
  }

  // Ringkasan per petugas
  const ringkasan = [...byPetugas.values()].map((g) => {
    const count = (s: string) => g.rows.filter((r) => r.status === s).length;
    const totalJam = g.rows.reduce((acc, r) => {
      if (!r.waktuSelesai) return acc;
      return acc + (new Date(r.waktuSelesai).getTime() - new Date(r.waktuMasuk).getTime()) / (1000 * 60 * 60);
    }, 0);
    return {
      petugas: g.petugas,
      hadir: count("hadir"),
      izin: count("izin"),
      sakit: count("sakit"),
      alpa: count("alpa"),
      totalJam,
    };
  });

  const totalHadir = ringkasan.reduce((a, r) => a + r.hadir, 0);

  return (
    <div className="ab-page-bg">
      <div className="ab-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="ab-toolbar">
          <div className="ab-toolbar-title">
            Rekap Absensi — {periode} · {ringkasan.length} petugas
          </div>
          <div className="ab-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href="/absensi" className="ab-toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        {/* Lembar rekap */}
        <div className="ab-sheet">
          <div className="ab-head">
            <div>
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat} · WA {perusahaan.whatsapp}</p>
            </div>
            <div className="ab-head-title">
              <h2>REKAP ABSENSI PETUGAS</h2>
              <p>Periode {periode}</p>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="ab-section">
            <h3>Ringkasan Kehadiran</h3>
            {ringkasan.length === 0 ? (
              <p className="ab-empty">Tidak ada data absensi pada periode ini</p>
            ) : (
              <table className="ab-table">
                <thead>
                  <tr>
                    <th>Nama Petugas</th>
                    <th>Jabatan</th>
                    <th className="ta-c">Hadir</th>
                    <th className="ta-c">Izin</th>
                    <th className="ta-c">Sakit</th>
                    <th className="ta-c">Alpa</th>
                    <th className="ta-r">Total Jam</th>
                  </tr>
                </thead>
                <tbody>
                  {ringkasan.map((r) => (
                    <tr key={r.petugas.id}>
                      <td>{r.petugas.nama}</td>
                      <td>{r.petugas.jabatan || "-"}</td>
                      <td className="ta-c">{r.hadir}</td>
                      <td className="ta-c">{r.izin}</td>
                      <td className="ta-c">{r.sakit}</td>
                      <td className="ta-c">{r.alpa}</td>
                      <td className="ta-r">{r.totalJam.toFixed(1)}</td>
                    </tr>
                  ))}
                  <tr className="ab-total-row">
                    <td colSpan={2}>Total Hadir</td>
                    <td className="ta-c">{totalHadir}</td>
                    <td colSpan={4} />
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          {/* Detail per petugas */}
          {[...byPetugas.values()].map((g) => (
            <div className="ab-section" key={g.petugas.id}>
              <h3>Detail — {g.petugas.nama} ({g.petugas.jabatan || "-"})</h3>
              <table className="ab-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th className="ta-c">Masuk</th>
                    <th className="ta-c">Selesai</th>
                    <th className="ta-c">Durasi</th>
                    <th className="ta-c">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) => {
                    const masuk = new Date(r.waktuMasuk);
                    return (
                      <tr key={r.id}>
                        <td>
                          {masuk.getDate()} {BULAN_SINGKAT[masuk.getMonth()]} {masuk.getFullYear()}
                        </td>
                        <td className="ta-c">{formatJam(masuk)}</td>
                        <td className="ta-c">
                          {r.waktuSelesai ? formatJam(new Date(r.waktuSelesai)) : "-"}
                        </td>
                        <td className="ta-c">
                          {durasiJam(masuk, r.waktuSelesai ? new Date(r.waktuSelesai) : null)}
                        </td>
                        <td className="ta-c">{STATUS_LABEL[r.status] || r.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Tanda tangan */}
          <div className="ab-sign">
            <div className="ab-sign-box">
              <p>Dibuat oleh,</p>
              <div className="ab-sign-space" />
              <p className="ab-sign-name">({session.nama})</p>
            </div>
            <div className="ab-sign-box">
              <p>Mengetahui,</p>
              <div className="ab-sign-space" />
              <p className="ab-sign-name">(................)</p>
            </div>
          </div>

          <div className="ab-foot">
            Dokumen di-generate pada {formatTanggalWaktuIndo(new Date())} · {perusahaan.nama}
          </div>
        </div>
      </div>
    </div>
  );
}
