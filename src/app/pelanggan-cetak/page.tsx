import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TombolCetak from "@/components/TombolCetak";
import { companyInfo } from "@/lib/invoice-format";
import "./pelanggan-cetak.css";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  aktif: { label: "AKTIF", className: "pl-status-aktif" },
  nonaktif: { label: "NONAKTIF", className: "pl-status-nonaktif" },
  calon: { label: "CALON", className: "pl-status-calon" },
  libur: { label: "LIBUR", className: "pl-status-libur" },
};

const KATEGORI_LABEL: Record<string, string> = {
  level_1: "Level 1",
  level_2: "Level 2",
  level_3: "Level 3",
  level_4: "Level 4",
  level_5: "Level 5",
  level_6: "Level 6",
  level_7: "Level 7",
  level_8: "Level 8",
  level_9: "Level 9",
  level_10: "Level 10",
};

/**
 * /pelanggan-cetak?status=&kategori=&kelurahanId=
 * Laporan / Daftar Pelanggan printable (PDF via window.print).
 */
export default async function PelangganCetakPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kategori?: string; kelurahanId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const where: any = { deletedAt: null };

  if (params.status) {
    where.status = params.status;
  }
  if (params.kategori) {
    where.kategori = params.kategori;
  }
  if (params.kelurahanId) {
    const kid = parseInt(params.kelurahanId, 10);
    if (!isNaN(kid)) {
      where.kelurahanId = kid;
    }
  }

  // Ambil data dari database
  const pelangganList = await prisma.pelanggan.findMany({
    where,
    orderBy: [{ kelurahanId: "asc" }, { nama: "asc" }],
    include: {
      kelurahan: true,
    },
  });

  // Data kelurahan untuk label
  let kelurahanLabel = "Semua Kelurahan";
  if (params.kelurahanId && !isNaN(parseInt(params.kelurahanId))) {
    const kel = await prisma.kelurahan.findUnique({
      where: { id: parseInt(params.kelurahanId) }
    });
    if (kel) kelurahanLabel = kel.nama;
  }

  const perusahaan = companyInfo();
  
  const statusLabel = params.status ? STATUS_MAP[params.status]?.label || params.status.toUpperCase() : "Semua Status";
  const kategoriLabel = params.kategori ? KATEGORI_LABEL[params.kategori] || params.kategori : "Semua Kategori";

  return (
    <div className="pl-page-bg">
      <div className="pl-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="pl-toolbar">
          <div className="pl-toolbar-title">
            Daftar Pelanggan ({pelangganList.length} Data)
          </div>
          <div className="pl-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href="/pelanggan" className="pl-toolbar-link">
              &larr; Kembali ke Data Pelanggan
            </Link>
          </div>
        </div>

        {/* Lembar cetak */}
        <div className="pl-sheet">
          {/* Kepala */}
          <div className="pl-head">
            <div className="pl-head-left">
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat} · {perusahaan.whatsapp}</p>
            </div>
            <div className="pl-head-right">
              <h2>DATA PELANGGAN</h2>
              <p>Daftar Rekapitulasi</p>
            </div>
          </div>

          {/* Info Ringkas */}
          <div className="pl-info">
            <div className="pl-info-row">
              <span>Kelurahan / Wilayah</span>
              <p>{kelurahanLabel}</p>
            </div>
            <div className="pl-info-row">
              <span>Status Pelanggan</span>
              <p>{statusLabel}</p>
            </div>
            <div className="pl-info-row">
              <span>Kategori</span>
              <p>{kategoriLabel}</p>
            </div>
            <div className="pl-info-row">
              <span>Total Data</span>
              <p>{pelangganList.length} Pelanggan</p>
            </div>
          </div>

          {/* Tabel Pelanggan */}
          <div className="pl-table-wrapper">
            {pelangganList.length === 0 ? (
              <div className="pl-empty">
                Tidak ada data pelanggan yang sesuai dengan filter.
              </div>
            ) : (
              <table className="pl-table">
                <thead>
                  <tr>
                    <th className="pl-col-no">No</th>
                    <th className="pl-col-kode">Kode</th>
                    <th className="pl-col-nama">Nama Pelanggan</th>
                    <th className="pl-col-alamat">Alamat / Patokan</th>
                    <th className="pl-col-telp">No. Telepon</th>
                    <th className="pl-col-kategori">Kategori</th>
                    <th className="pl-col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pelangganList.map((p, idx) => {
                    const statusData = STATUS_MAP[p.status] || { label: p.status, className: "" };
                    const katLabel = KATEGORI_LABEL[p.kategori] || p.kategori;
                    return (
                      <tr key={p.id}>
                        <td className="pl-col-no">{idx + 1}</td>
                        <td className="pl-col-kode">{p.kodePelanggan || "-"}</td>
                        <td className="pl-col-nama">
                          {p.nama}
                          {p.penanggungjawab && p.penanggungjawab !== p.nama && (
                            <span style={{ display: 'block', fontSize: '9px', color: '#6b6e66', marginTop: '2px' }}>
                              PIC: {p.penanggungjawab}
                            </span>
                          )}
                        </td>
                        <td className="pl-col-alamat">
                          {p.alamat}
                          {p.rtRw && <span> (RT/RW: {p.rtRw})</span>}
                          {p.patokanLokasi && (
                            <span style={{ display: 'block', fontSize: '9px', color: '#6b6e66', marginTop: '2px' }}>
                              Patokan: {p.patokanLokasi}
                            </span>
                          )}
                          {p.kelurahan && (
                            <span style={{ display: 'block', fontSize: '9px', color: '#6b6e66', marginTop: '2px' }}>
                              Kelurahan: {p.kelurahan.nama}
                            </span>
                          )}
                        </td>
                        <td className="pl-col-telp">{p.noTelepon || "-"}</td>
                        <td className="pl-col-kategori">{katLabel}</td>
                        <td className="pl-col-status">
                          <span className={statusData.className}>{statusData.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="pl-foot">
            <p>
              Di-generate pada {new Date().toLocaleString("id-ID")} · {perusahaan.nama}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
