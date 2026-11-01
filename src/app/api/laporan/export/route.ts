import { NextResponse } from "next/server";
import { getLaporan, labelKategoriPengeluaran, labelJenisSampah } from "@/lib/laporan";

function csvEscape(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  // Anti CSV formula injection: nilai yang diawali karakter formula Excel
  // (=, +, -, @) diberi prefix apostrophe agar tidak dieksekusi sebagai formula.
  if (/^[=+\-@]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * GET /api/laporan/export?bulan=&tahun=
 * Ekspor laporan keuangan & operasional lengkap dalam format CSV multi-seksi berstandar audit.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const bulan = Math.min(
    12,
    Math.max(1, parseInt(searchParams.get("bulan") || String(now.getMonth() + 1)) || now.getMonth() + 1)
  );
  const tahun = parseInt(searchParams.get("tahun") || String(now.getFullYear())) || now.getFullYear();

  const data = await getLaporan(bulan, tahun);
  const NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const periode = `${NAMA_BULAN[bulan - 1]} ${tahun}`;

  const rows: (string | number | null)[][] = [];

  // 1. HEADER DOKUMEN
  rows.push(["LAPORAN KEUANGAN & OPERASIONAL EKSEKUTIF"]);
  rows.push(["UPS HERU KOTA DEPOK (WASTEPAY)"]);
  rows.push([`Periode: ${periode}`]);
  rows.push([`Standar Akuntansi: PSAK 72 (Pendapatan Kontrak) & PSAK 71 (Instrumen Keuangan)`]);
  rows.push([`Tanggal Unduh: ${new Date().toISOString()}`]);
  rows.push([""]);

  // 2. RINGKASAN EKSEKUTIF C-LEVEL
  rows.push(["=== 1. RINGKASAN INDIKATOR VITAL KEUANGAN (C-LEVEL COCKPIT) ==="]);
  rows.push(["Indikator", "Nilai (Rp / %)", "Keterangan"]);
  rows.push(["Pendapatan Akrual Bersih (Earned Revenue PSAK 72)", data.kpi.earnedAccrualRevenue, "Hak pendapatan murni periode berjalan"]);
  rows.push(["Total Tagihan Terbit (Gross Billed)", data.kpi.grossBilledCurrent, "Nilai tagihan iuran yang diterbitkan"]);
  rows.push(["Realisasi Kas Masuk (Realized Cash Inflow)", data.kpi.totalRealizedCash, "Uang kas fisik/bank yang nyata diterima"]);
  rows.push(["Realisasi Beban Kas (Operating Opex)", data.kpi.totalPengeluaran, "BBM, upah kru, perawatan armada, TPA"]);
  rows.push(["Surplus Laba Operasional (Accrual Profit)", data.kpi.accrualOperatingProfit, "Laba bersih operasional sebelum pajak"]);
  rows.push(["Margin Laba Operasional", `${data.kpi.accrualMarginPersen.toFixed(2)}%`, "Persentase laba terhadap earned revenue"]);
  rows.push(["Arus Kas Bersih (Net Cash Flow)", data.kpi.netCashFlow, "Selisih kas masuk riil minus kas keluar riil"]);
  rows.push(["Gross Collection Rate (GCR)", `${data.kpi.grossCollectionRate.toFixed(2)}%`, "Efisiensi penagihan periode berjalan"]);
  rows.push(["Days Sales Outstanding (DSO)", `${data.kpi.dsoHari} Hari`, "Rata-rata hari konversi piutang menjadi kas"]);
  rows.push(["Pelanggan Aktif Berlangganan", data.kpi.pelangganAktifCount, "Jumlah KK aktif dilayani"]);
  rows.push([""]);

  // 3. JEMBATAN REKONSILIASI ARUS KAS KE AKRUAL (PSAK 72 BRIDGE)
  rows.push(["=== 2. JEMBATAN REKONSILIASI ARUS KAS KE AKRUAL (PSAK 72 WATERFALL) ==="]);
  rows.push(["Komponen Rekonsiliasi", "Nominal (Rp)", "Perlakuan Akuntansi"]);
  rows.push(["[+] Total Realisasi Kas Masuk Aktual", data.bridge.realizedCashInflow, "Cash Inflow"]);
  rows.push(["  - Dari Tagihan Periode Berjalan", data.bridge.currentBilledCollected, "Current Inflow"]);
  rows.push(["  - Dari Pelunasan Piutang Bulan Lalu", data.bridge.pastArrearsCollected, "Arrears Recovery"]);
  rows.push(["  - Titipan Pembayaran di Muka (Deferred Revenue)", -data.bridge.prepaidFutureCollected, "Eliminasi Kas Periode Depan"]);
  rows.push(["[=] Kas Masuk Hak Periode Berjalan", data.bridge.currentBilledCollected, "Realized Operating Cash"]);
  rows.push(["[+] Tagihan Periode Ini yg Dilunasi Bulan Lalu", data.bridge.prepaidPastRecognized, "Pengakuan Liabilitas Uang Muka"]);
  rows.push(["[+] Piutang Berjalan Belum Terbayar", data.bridge.accruedUncollected, "Pengakuan Aset Piutang Baru"]);
  rows.push(["[=] PENDAPATAN OPERASIONAL SEJATI (EARNED REVENUE)", data.bridge.earnedAccrualRevenue, "Hak Pendapatan Murni PSAK 72"]);
  rows.push(["[-] Total Beban Operasional Kas", -data.bridge.accrualOperatingExpenses, "Direct Operating Costs"]);
  rows.push(["[=] SURPLUS LABA OPERASIONAL SEJATI", data.bridge.accrualOperatingProfit, `Margin ${data.bridge.accrualMarginPersen.toFixed(2)}%`]);
  rows.push([""]);

  // 4. PEMASUKAN PER KANAL
  rows.push(["=== 3. REALISASI KAS MASUK PER KANAL PEMBAYARAN ==="]);
  rows.push(["Kanal Pembayaran", "Jumlah (Rp)", "Tipe Kanal"]);
  for (const m of data.pemasukanByMetode) {
    let nama = m.metode;
    let tipe = "Manual";
    if (m.metode.startsWith("duitku") || ["qris", "ewallet", "virtual_account"].includes(m.metode)) {
      nama = "Payment Gateway Duitku (QRIS / VA)";
      tipe = "Automated Gateway";
    } else if (m.metode === "transfer") {
      nama = "Transfer Bank Manual";
      tipe = "Rekening Bank";
    } else if (m.metode === "tunai") {
      nama = "Kas Tunai (Petugas / Kasir)";
      tipe = "Uang Fisik";
    }
    rows.push([nama, m.jumlah, tipe]);
  }
  rows.push(["TOTAL KAS MASUK RIIL", data.totalPemasukan, ""]);
  rows.push([""]);

  // 5. PENGELUARAN PER KATEGORI
  rows.push(["=== 4. REALISASI BEBAN KAS OPERASIONAL ==="]);
  rows.push(["Kategori Pengeluaran", "Jumlah (Rp)"]);
  for (const k of data.pengeluaranByKategori) {
    rows.push([labelKategoriPengeluaran(k.kategori), k._sum.jumlah || 0]);
  }
  rows.push(["TOTAL BEBAN KAS", data.totalPengeluaran]);
  rows.push([""]);

  // 6. AGING SCHEDULE PIUTANG (PSAK 71)
  rows.push(["=== 5. JADWAL UMUR PIUTANG & CADANGAN PENURUNAN NILAI (PSAK 71) ==="]);
  rows.push(["Kategori Umur", "Rentang Hari", "Jumlah Tagihan", "Jumlah Debitur", "Saldo Piutang (Rp)", "% CKPN", "Cadangan Kerugian (Rp)"]);
  for (const b of data.agingSchedule.buckets) {
    rows.push([
      b.label,
      b.rentangHari,
      b.jumlahTagihan,
      b.jumlahPelanggan,
      b.totalNominal,
      `${b.persenCkpn}%`,
      b.nilaiCkpn,
    ]);
  }
  rows.push([
    "TOTAL PORTOFOLIO PIUTANG",
    "-",
    "-",
    data.agingSchedule.totalDebiturUnik,
    data.agingSchedule.totalPiutangGross,
    "-",
    data.agingSchedule.totalNilaiCkpn,
  ]);
  rows.push([
    "NILAI BUKU BERSIH PIUTANG (NET CARRYING VALUE)",
    "-",
    "-",
    "-",
    data.agingSchedule.netCarryingValuePiutang,
    "-",
    "-",
  ]);
  rows.push([""]);

  // 7. UNIT ECONOMICS PERSAMPAHAN
  rows.push(["=== 6. METRIK LOGISTIK PERSAMPAHAN & UNIT ECONOMICS ==="]);
  rows.push(["Metrik Unit Economics", "Nilai", "Satuan"]);
  rows.push(["Total Tonase Sampah Terkelola", (data.totalBerat / 1000).toFixed(2), "Ton"]);
  rows.push(["Total Kubikasi Sampah", data.totalVolume.toFixed(2), "m³"]);
  rows.push(["Total Ritase Armada", data.unitEconomics.totalRitase, "Trip Pengangkutan"]);
  rows.push(["Rata-rata Muatan per Trip", data.unitEconomics.muatanPerRitaseTon.toFixed(2), "Ton / Ritase"]);
  rows.push(["Biaya Logistik per Tonase", Math.round(data.unitEconomics.totalCostPerTon), "Rp / Ton"]);
  rows.push(["Biaya Armada per Ritase", Math.round(data.unitEconomics.totalRitase > 0 ? data.totalPengeluaran / data.unitEconomics.totalRitase : 0), "Rp / Trip"]);
  rows.push(["Omset Retribusi per Tonase", Math.round(data.unitEconomics.revenuePerTon), "Rp / Ton"]);
  rows.push(["Margin per Tonase", Math.round(data.unitEconomics.marginPerTon), "Rp / Ton"]);
  rows.push(["ARPU (Rata-rata Retribusi per KK)", Math.round(data.unitEconomics.arpu), "Rp / KK / Bulan"]);
  rows.push(["Cost to Serve per KK", Math.round(data.unitEconomics.costToServePerUser), "Rp / KK / Bulan"]);
  rows.push(["Margin Kontribusi per KK", Math.round(data.unitEconomics.netMarginPerUser), "Rp / KK / Bulan"]);
  rows.push([""]);

  // 8. PEMBUANGAN TPA
  rows.push(["=== 7. DISTRIBUSI PEMBUANGAN KE TPA ==="]);
  rows.push(["Nama TPA", "Volume (m³)", "Berat (kg)", "Frekuensi Ritase"]);
  for (const t of data.sampahByTpa) {
    rows.push([t.nama, t.volume.toFixed(1), t.berat.toFixed(0), t.count]);
  }
  rows.push([""]);

  // 9. DAFTAR DEBITUR MENUNGGAK LENGKAP
  rows.push(["=== 8. DAFTAR DEBITUR TERTUNGGAK (AUDIT DETAIL) ==="]);
  rows.push(["No", "Kode Pelanggan", "Nama Pelanggan", "Kelurahan", "No. Telepon", "Periode Tagihan", "Nominal Tunggakan (Rp)"]);
  data.tagihanMenunggak.forEach((t, idx) => {
    rows.push([
      idx + 1,
      t.pelanggan.kodePelanggan || "-",
      t.pelanggan.nama,
      t.pelanggan.kelurahan?.nama || "-",
      t.pelanggan.noTelepon || "-",
      `${NAMA_BULAN[t.bulan - 1]} ${t.tahun}`,
      t.jumlah,
    ]);
  });
  rows.push([""]);

  // 10. REKAPITULASI REFERRAL MITRA
  if (data.rekapReferral.length > 0) {
    rows.push(["=== 9. REKAPITULASI AGEN REFERRAL PETUGAS & MITRA ==="]);
    rows.push(["No", "Kode Referral / Nama Agen", "Total Pelanggan Terdaftar (KK)"]);
    data.rekapReferral.forEach((r, idx) => {
      rows.push([idx + 1, r.referal, r.total]);
    });
  }

  // Format ke CSV dengan delimiter koma & UTF-8 BOM agar Excel menampilkan aksen dengan benar
  const csvContent =
    "\uFEFF" +
    rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(","))
      .join("\r\n");

  const filename = `Laporan-Keuangan-WastePay-${tahun}-${String(bulan).padStart(2, "0")}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
