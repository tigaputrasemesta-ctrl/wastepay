import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getManifestPengangkutan,
  getSuratJalanHeader,
} from "@/lib/surat-jalan";
import TombolCetak from "@/components/TombolCetak";
import { companyInfo } from "@/lib/invoice-format";
import { namaHari, todayLocalISO, formatDate } from "@/lib/utils";
import "./surat-jalan.css";

const STATUS_CEKLIS = [
  { key: "diambil", label: "Diambil" },
  { key: "tidak_diangkut", label: "Tidak Diangkut" },
  { key: "kosong", label: "Kosong" },
] as const;

/**
 * /surat-jalan?tanggal=YYYY-MM-DD&petugasId=N
 * Surat jalan / manifest pengangkutan harian (printable via window.print).
 * - Petugas login → selalu miliknya sendiri (petugasId diabaikan).
 * - Admin/kasir → bisa pilih petugas tertentu atau kosongkan untuk semua.
 */
export default async function SuratJalanPage({
  searchParams,
}: {
  searchParams: Promise<{ tanggal?: string; petugasId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const sp = await searchParams;

  // Tanggal lokal (bukan UTC) — default hari ini
  const tanggalStr = sp.tanggal || todayLocalISO();
  const tanggal = new Date(`${tanggalStr}T00:00:00`);
  if (Number.isNaN(tanggal.getTime())) notFound();

  let petugasId: number | undefined;
  if (sp.petugasId) {
    const pid = parseInt(sp.petugasId, 10);
    if (Number.isInteger(pid)) petugasId = pid;
  }

  // Petugas lapangan → paksa ke profilnya sendiri
  if (session.role === "petugas") {
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });
    if (!profil) redirect("/login");
    petugasId = profil.id;
  }

  const hari = namaHari(tanggal);
  const tasks = await getManifestPengangkutan({ tanggal, petugasId });
  const header = petugasId ? await getSuratJalanHeader(petugasId, hari) : null;

  const perusahaan = companyInfo();
  const kendaraan = header?.kendaraan[0];
  const judulPetugas = header
    ? header.nama
    : "Semua Petugas";
  const judulKendaraan = kendaraan
    ? `${kendaraan.nama}${kendaraan.platNomor ? ` (${kendaraan.platNomor})` : ""}`
    : "-";

  return (
    <div className="sj-page-bg">
      <div className="sj-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="sj-toolbar">
          <div className="sj-toolbar-title">
            Surat Jalan — {formatDate(tanggal)} · {judulPetugas}
          </div>
          <div className="sj-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href="/pengangkutan" className="sj-toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        {/* Lembar surat jalan */}
        <div className="sj-sheet">
          {/* Kepala */}
          <div className="sj-head">
            <div className="sj-head-left">
              <div className="sj-logo-box">O2W</div>
              <div>
                <h1>{perusahaan.nama}</h1>
                <p>{perusahaan.alamat} · {perusahaan.whatsapp}</p>
              </div>
            </div>
            <div className="sj-head-right">
              <h2>SURAT JALAN</h2>
              <p>Pengangkutan Sampah Harian</p>
            </div>
          </div>

          {/* Info kepala */}
          <div className="sj-info">
            <div className="sj-info-row">
              <span>Hari / Tanggal</span>
              <p>{hari}, {formatDate(tanggal)}</p>
            </div>
            <div className="sj-info-row">
              <span>Petugas</span>
              <p>{judulPetugas}{header?.noTelepon ? ` · ${header.noTelepon}` : ""}</p>
            </div>
            <div className="sj-info-row">
              <span>Kendaraan</span>
              <p>{judulKendaraan}</p>
            </div>
            <div className="sj-info-row">
              <span>Rute</span>
              <p>{header?.ruteNama.length ? header.ruteNama.join(", ") : "-"}</p>
            </div>
            <div className="sj-info-row">
              <span>Jumlah Titik</span>
              <p>{tasks.length} pelanggan</p>
            </div>
          </div>

          {/* Tabel manifest */}
          {tasks.length === 0 ? (
            <div className="sj-empty">
              Tidak ada tugas pengangkutan untuk tanggal ini.
            </div>
          ) : (
            <table className="sj-table">
              <thead>
                <tr>
                  <th className="col-no">No</th>
                  <th className="col-kode">Kode</th>
                  <th className="col-nama">Nama Pelanggan</th>
                  <th className="col-alamat">Alamat / Patokan</th>
                  {!petugasId && <th className="col-petugas">Petugas</th>}
                  <th className="col-status">Status Lapangan</th>
                  <th className="col-vol">Vol (m³)</th>
                  <th className="col-berat">Berat (kg)</th>
                  <th className="col-ket">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t.id}>
                    <td className="col-no">{i + 1}</td>
                    <td className="col-kode">{t.pelanggan.kodePelanggan || "-"}</td>
                    <td className="col-nama">
                      {t.pelanggan.nama}
                      {t.pelanggan.patokanLokasi && (
                        <span className="sj-patokan"> · {t.pelanggan.patokanLokasi}</span>
                      )}
                    </td>
                    <td className="col-alamat">{t.pelanggan.alamat || "-"}</td>
                    {!petugasId && (
                      <td className="col-petugas">{t.petugas?.nama || "-"}</td>
                    )}
                    <td className="col-status">
                      {STATUS_CEKLIS.map((s) => (
                        <label key={s.key} className="sj-check">
                          <span className={`sj-box ${t.status === s.key ? "sj-box-checked" : ""}`}>
                            {t.status === s.key ? "✓" : ""}
                          </span>
                          {s.label}
                        </label>
                      ))}
                    </td>
                    <td className="col-vol">{t.volume ?? ""}</td>
                    <td className="col-berat">{t.berat ?? ""}</td>
                    <td className="col-ket">{t.catatan || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Tanda tangan */}
          <div className="sj-sign">
            <div className="sj-sign-box">
              <p>Petugas,</p>
              <div className="sj-sign-space" />
              <p className="sj-sign-name">({header?.nama || "................"})</p>
            </div>
            <div className="sj-sign-box">
              <p>Mengetahui,</p>
              <div className="sj-sign-space" />
              <p className="sj-sign-name">(................)</p>
            </div>
          </div>

          {/* Footer */}
          <div className="sj-foot">
            <p>
              Di-generate pada {new Date().toLocaleString("id-ID")} · {perusahaan.nama}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
