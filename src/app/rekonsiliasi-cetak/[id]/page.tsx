import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { getRekonsiliasiById, formatNoBeritaAcara } from "@/lib/rekonsiliasi";
import TombolCetak from "@/components/TombolCetak";
import { formatRupiah, formatDate } from "@/lib/utils";
import { formatTanggalWaktuIndo, companyInfo } from "@/lib/invoice-format";
import "../rekonsiliasi-cetak.css";

/**
 * /rekonsiliasi-cetak/[id] — Berita acara rekonsiliasi kas (printable).
 * Hanya admin/superadmin.
 */
export default async function RekonsiliasiCetakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || !hasRole(session, "admin")) redirect("/login");

  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) notFound();

  const r = await getRekonsiliasiById(id);
  if (!r) notFound();

  const perusahaan = companyInfo();
  const noBA = formatNoBeritaAcara(r.id);
  const selisih = r.selisih;
  const adaSelisih = selisih !== null && selisih !== 0;

  const kesimpulan = adaSelisih
    ? `Terdapat selisih sebesar ${formatRupiah(Math.abs(selisih))} (${
        (selisih as number) > 0 ? "kelebihan kas" : "kekurangan kas"
      })`
    : "Kas dinyatakan COCOK (tidak ada selisih)";

  return (
    <div className="ba-page-bg">
      <div className="ba-wrapper">
        {/* Toolbar (layar saja) */}
        <div className="ba-toolbar">
          <div className="ba-toolbar-title">
            Berita Acara {noBA}
          </div>
          <div className="ba-toolbar-actions">
            <TombolCetak label="Cetak / Unduh PDF" />
            <Link href="/rekonsiliasi" className="ba-toolbar-link">
              &larr; Kembali
            </Link>
          </div>
        </div>

        {/* Lembar berita acara */}
        <div className="ba-sheet">
          <div className="ba-head">
            <div className="ba-logo-box">TPS</div>
            <div>
              <h1>{perusahaan.nama}</h1>
              <p>{perusahaan.alamat}</p>
            </div>
          </div>

          <div className="ba-title">
            BERITA ACARA REKONSILIASI KAS
          </div>
          <div className="ba-no">
            Nomor: {noBA}
          </div>

          <p className="ba-opening">
            Pada hari ini, <b>{formatDate(r.tanggal)}</b>, telah dilakukan rekonsiliasi
            kas harian dengan hasil sebagai berikut:
          </p>

          <table className="ba-table">
            <tbody>
              <tr>
                <td>1. Total pemasukan (menurut sistem)</td>
                <td className="ta-r">{formatRupiah(r.totalPemasukan)}</td>
              </tr>
              <tr>
                <td>2. Total pengeluaran (menurut sistem)</td>
                <td className="ta-r">{formatRupiah(r.totalPengeluaran)}</td>
              </tr>
              <tr>
                <td>3. Total tunai (menurut sistem)</td>
                <td className="ta-r">{formatRupiah(r.totalTunaiSistem)}</td>
              </tr>
              <tr>
                <td>4. Total tunai fisik (hasil penghitungan)</td>
                <td className="ta-r">{r.totalTunaiFisik !== null ? formatRupiah(r.totalTunaiFisik) : "-"}</td>
              </tr>
              <tr className="ba-selisih-row">
                <td>5. Selisih</td>
                <td className="ta-r">{selisih !== null ? formatRupiah(selisih) : "-"}</td>
              </tr>
            </tbody>
          </table>

          <div className={`ba-conclusion ${adaSelisih ? "ba-conclusion-selisih" : "ba-conclusion-cocok"}`}>
            Kesimpulan: {kesimpulan}
          </div>

          {r.catatan && (
            <div className="ba-catatan">
              <span>Catatan:</span>
              <p>{r.catatan}</p>
            </div>
          )}

          <div className="ba-meta">
            <p>Dibuat oleh: <b>{r.user?.nama || "-"}</b></p>
            <p>Tanggal pembuatan: {formatTanggalWaktuIndo(r.createdAt)}</p>
          </div>

          {/* Tanda tangan */}
          <div className="ba-sign">
            <div className="ba-sign-box">
              <p>Petugas Kas,</p>
              <div className="ba-sign-space" />
              <p className="ba-sign-name">({r.user?.nama || "................"})</p>
            </div>
            <div className="ba-sign-box">
              <p>Mengetahui,</p>
              <div className="ba-sign-space" />
              <p className="ba-sign-name">(................)</p>
            </div>
          </div>

          <div className="ba-foot">
            Dokumen di-generate pada {formatTanggalWaktuIndo(new Date())} · {perusahaan.nama}
          </div>
        </div>
      </div>
    </div>
  );
}
