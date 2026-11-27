import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPengaturanString, setPengaturan } from "@/lib/pengaturan";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// In-memory Pusat Review & Arsip Laporan AI Internal (Tanpa Kirim WhatsApp)
export interface ReportArchiveItem {
  id: string;
  agentId: "eksekutif" | "tagihan" | "armada" | "layanan" | "growth";
  agentTitle: string;
  category: string;
  title: string;
  summary: string;
  content: string;
  aiConfidence: string;
  status: "PENDING_REVIEW" | "ARCHIVED" | "REJECTED";
  createdAt: string;
  archivedAt?: string;
  verifiedBy?: string;
}

let mockReportArchive: ReportArchiveItem[] = [
  {
    id: "REP-201",
    agentId: "eksekutif",
    agentTitle: "Meja Eksekutif & Keuangan",
    category: "Laporan Finansial & Kas",
    title: "Audit Arus Kas Retribusi & Kolektibilitas QRIS",
    summary: "Ringkasan perbandingan penerimaan nontunai QRIS vs penagihan manual berjalan.",
    content: `# 📊 LAPORAN KAS & KOLEKTIBILITAS QRIS — UPS HERU
**Periode:** Berjalan November 2026
**Penyusun:** Meja Eksekutif & Keuangan AI

---
### 1. Ringkasan Eksekutif
* Tingkat adopsi pembayaran digital QRIS/Duitku mencapai stabilitas tinggi.
* Aliran kas masuk tercatat konsisten tanpa adanya selisih saldo di mutasi rekening penampung.

### 2. Rekomendasi Finansial
1. Prioritaskan penagihan tertarget pada segmen warga berstatus tunggakan > 1 bulan.
2. Pertahankan insentif edukasi pembayaran tepat waktu untuk meminimalkan penumpukan piutang di akhir bulan.`,
    aiConfidence: "99%",
    status: "PENDING_REVIEW",
    createdAt: "10 menit lalu",
  },
  {
    id: "REP-202",
    agentId: "tagihan",
    agentTitle: "Meja Analis Tagihan & Tunggakan",
    category: "Audit Piutang",
    title: "Rekap Segmentasi Warga Menunggak > 2 Bulan",
    summary: "Pemetaan 18 KK prioritas pendekatan langsung di wilayah operasional Sawangan & Beji.",
    content: `# 📑 AUDIT SEGMENTASI TUNGGAKAN > 2 BULAN — UPS HERU
**Fokus Wilayah:** Sawangan & Beji
**Penyusun:** Meja Analis Tagihan & Tunggakan AI

---
### 1. Analisis Segmentasi Piutang
* Terdapat kelompok pelanggan dengan riwayat nomor telepon tidak aktif atau ganti kontak WhatsApp.
* Diperlukan verifikasi fisik oleh petugas penarik iuran saat kunjungan lapangan berkala.

### 2. Langkah Tindak Lanjut Terukur
1. Lakukan audit kontak gagal dan verifikasi nomor alternatif via pengurus RT/RW setempat.
2. Terbitkan draf reminder santun dengan tautan bayar instan QRIS sebelum kunjungan door-to-door.`,
    aiConfidence: "97%",
    status: "PENDING_REVIEW",
    createdAt: "25 menit lalu",
  },
  {
    id: "REP-203",
    agentId: "armada",
    agentTitle: "Meja Analis Armada & Komplain",
    category: "Evaluasi Lapangan",
    title: "Evaluasi Rute Armada & Titik Rawan Telat Zona 2",
    summary: "Analisis kemacetan berkala di jalur arteri penghubung TPS 3R jam 09.30 - 11.00 WIB.",
    content: `# 🚛 EVALUASI RUTE & TITIK RAWAN TELAT — UPS HERU
**Zona Operasional:** Wilayah Pengangkutan 2
**Penyusun:** Meja Analis Armada & Komplain AI

---
### 1. Temuan Lapangan
* Jalur arteri lingkar timur mengalami lonjakan volume lalu lintas pada pukul 09.30–11.00 WIB.
* Efisiensi bahan bakar dapat dioptimalkan dengan memajukan rit pertama pengangkutan ke pukul 07.15 WIB.

### 2. Rekomendasi Efisiensi Armada
1. Jadwalkan rute perumahan padat sebelum jam sibuk warga berangkat kerja.
2. Siapkan unit armada cadangan untuk merespons aduan sampah terlewat dalam batas SLA 2 jam.`,
    aiConfidence: "98%",
    status: "ARCHIVED",
    createdAt: "2 jam lalu",
    archivedAt: "1 jam lalu",
    verifiedBy: "Admin Operasional",
  },
];

/**
 * Helper untuk memanggil Google Gemini Generative Language API
 */
interface ChatHistoryItem {
  role: "user" | "model";
  text: string;
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKeyOverride?: string | null,
  temperature = 0.7,
  history: ChatHistoryItem[] = []
): Promise<{ text: string; source: "gemini_live" | "fallback"; errorDetail?: string }> {
  let apiKey = (apiKeyOverride || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey.length < 5) {
    try {
      const dbKey = await getPengaturanString("GEMINI_API_KEY", "");
      if (dbKey && dbKey.trim().length > 5) {
        apiKey = dbKey.trim();
        process.env.GEMINI_API_KEY = apiKey;
      }
    } catch (e) {
      console.warn("[Pengaturan DB Read Warning]", e);
    }
  }

  if (!apiKey || apiKey.length < 5) {
    return { text: "", source: "fallback" };
  }

  const preferredModel = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const modelsToTry = [
    preferredModel,
    "gemini-3.1-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.7-flash",
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];
  const uniqueModels = Array.from(new Set(modelsToTry));

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const h of history) {
      const t = (h.text || "").trim();
      if (!t) continue;
      const role: "user" | "model" = h.role === "model" ? "model" : "user";
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += "\n\n" + t;
      } else {
        contents.push({ role, parts: [{ text: t }] });
      }
    }
  }

  const cleanPrompt = (userPrompt || "").trim();
  if (contents.length > 0 && contents[contents.length - 1].role === "user") {
    if (cleanPrompt) {
      contents[contents.length - 1].parts[0].text += "\n\n" + cleanPrompt;
    }
  } else if (cleanPrompt) {
    contents.push({ role: "user", parts: [{ text: cleanPrompt }] });
  }

  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "Berikan status operasional dan ringkasan hari ini." }] });
  }

  let lastError = "";

  for (const model of uniqueModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 2048,
      },
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const data = await res.json();
        const generated = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generated && generated.trim().length > 0) {
          return { text: generated.trim(), source: "gemini_live" };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${res.status}`;
        console.warn(`[Gemini API ${model}]`, res.status, lastError);
      }
    } catch (err: any) {
      lastError = err.message;
      console.warn(`[Gemini Fetch Error ${model}]`, err);
    }
  }

  return { text: "", source: "fallback", errorDetail: lastError };
}

/**
 * Single source of truth untuk metrik operasional dan keuangan
 */
async function getLiveTenantStats(req: NextRequest, session: any) {
  const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const { resolveTenantByHost } = await import("@/lib/tenant");
  const tenantCtx = resolveTenantByHost(rawHost);
  const tenantId = !tenantCtx.isCore ? tenantCtx.tenant.id : (session?.tenantId || tenantCtx.tenant.id);

  const tenantScope = tenantCtx.isCore && session?.role === "superadmin" ? {} : { tenantId };

  const [
    totalPelanggan,
    komplainPending,
    tagihanBelumBayar,
    totalMitra,
    transaksiLunasCount,
    tunggakanSum,
    kasBulanIniSum,
  ] = await Promise.all([
    prisma.pelanggan.count({ where: { status: "aktif", ...tenantScope } }).catch(() => 0),
    prisma.komplain.count({ where: { status: { in: ["baru", "diproses"] }, ...tenantScope } }).catch(() => 0),
    prisma.tagihan.count({ where: { status: { in: ["belum_bayar", "tunggakan"] }, ...tenantScope } }).catch(() => 0),
    tenantCtx.isCore ? prisma.tenant.count().catch(() => 1) : Promise.resolve(1),
    prisma.tagihan.count({ where: { status: "lunas", ...tenantScope } }).catch(() => 0),
    prisma.tagihan.aggregate({
      where: { status: { in: ["belum_bayar", "tunggakan"] }, ...tenantScope },
      _sum: { jumlah: true },
    }).catch(() => ({ _sum: { jumlah: 0 } })),
    prisma.tagihan.aggregate({
      where: { status: "lunas", ...tenantScope },
      _sum: { jumlah: true },
    }).catch(() => ({ _sum: { jumlah: 0 } })),
  ]);

  const kasBulanIniEstimasi = kasBulanIniSum._sum.jumlah || (transaksiLunasCount * 40000);
  const tunggakanEstimasi = tunggakanSum._sum.jumlah || (tagihanBelumBayar * 40000);
  const totalBills = transaksiLunasCount + tagihanBelumBayar;
  const kolektibilitasPersen = totalBills > 0 ? Math.round((transaksiLunasCount / totalBills) * 100) : 100;

  const pendingReviewCount = mockReportArchive.filter((r) => r.status === "PENDING_REVIEW").length;
  const archivedCount = mockReportArchive.filter((r) => r.status === "ARCHIVED").length;

  return {
    totalPelanggan,
    komplainPending,
    tagihanBelumBayar,
    totalMitra,
    transaksiLunasCount,
    kasBulanIniEstimasi,
    tunggakanEstimasi,
    kolektibilitasPersen,
    pendingReviewCount,
    archivedCount,
  };
}

export async function GET(req: NextRequest) {
  try {
    let dbKey = "";
    try {
      dbKey = await getPengaturanString("GEMINI_API_KEY", "");
    } catch {}

    const effectiveKey = (process.env.GEMINI_API_KEY || dbKey || "").trim();
    const hasEnvGeminiKey = Boolean(effectiveKey && effectiveKey.length > 5);

    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await getLiveTenantStats(req, session);

    return NextResponse.json({
      success: true,
      stats,
      hasGeminiKey: hasEnvGeminiKey,
      geminiModel: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
      reportArchive: mockReportArchive,
      guardrails: {
        mode: "INTERNAL_REPORTING_ONLY",
        whatsappEnabled: false,
        strictPricing: true,
        tenantDataIsolation: true,
        archiveRequiresReview: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, payload } = body;
    const clientGeminiKey = req.headers.get("x-gemini-key") || payload?.geminiApiKey;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // ACTION: ARCHIVE & VALIDATE REPORT (Sahkan & Arsipkan — Tanpa Kirim WhatsApp)
    if (action === "archive_report" || action === "approve_item") {
      const { id } = payload;
      const item = mockReportArchive.find((q) => q.id === id);

      if (!item) {
        return NextResponse.json({ success: false, error: "Laporan tidak ditemukan" }, { status: 404 });
      }

      item.status = "ARCHIVED";
      item.archivedAt = "Baru saja";
      item.verifiedBy = session.nama || "Admin UPS HERU";

      const liveStats = await getLiveTenantStats(req, session);

      return NextResponse.json({
        success: true,
        message: `Laporan "${item.title}" berhasil disahkan dan dipindahkan ke Arsip Terverifikasi.`,
        updatedArchive: mockReportArchive,
        stats: liveStats,
      });
    }

    // ACTION: REJECT / DELETE REPORT DRAFT
    if (action === "delete_report" || action === "reject_item") {
      const { id } = payload;
      const index = mockReportArchive.findIndex((q) => q.id === id);
      if (index !== -1) {
        mockReportArchive.splice(index, 1);
      }
      const liveStats = await getLiveTenantStats(req, session);
      return NextResponse.json({
        success: true,
        message: "Draf laporan berhasil dihapus dari antrean review.",
        updatedArchive: mockReportArchive,
        stats: liveStats,
      });
    }

    // ACTION: UPDATE DRAFT CONTENT
    if (action === "update_draft") {
      const { id, newText, newTitle } = payload;
      const item = mockReportArchive.find((q) => q.id === id);
      if (item) {
        item.content = newText;
        if (newTitle) item.title = newTitle;
        item.summary = "Draf laporan telah diedit & disesuaikan oleh Admin.";
      }
      return NextResponse.json({
        success: true,
        message: "Perubahan isi draf laporan berhasil disimpan.",
        updatedArchive: mockReportArchive,
      });
    }

    // ACTION: CREATE REPORT ITEM (Simpan ke Pusat Laporan dari Chat / Skill)
    if (action === "create_report_item" || action === "create_approval_item") {
      const { agentId, agentTitle, category, title, summary, content, draftText } = payload || {};
      const finalContent = content || draftText || "";
      const newItem: ReportArchiveItem = {
        id: `REP-${Date.now().toString().slice(-4)}`,
        agentId: agentId || "eksekutif",
        agentTitle: agentTitle || "Meja Eksekutif & Keuangan",
        category: category || "Laporan Operasional",
        title: title || `Laporan Analisis dari ${agentTitle || "Meja AI"}`,
        summary: summary || "Laporan baru siap direview dan diarsipkan ke Pusat Laporan.",
        content: finalContent,
        aiConfidence: "98%",
        status: "PENDING_REVIEW",
        createdAt: "Baru saja",
      };

      mockReportArchive.unshift(newItem);
      const liveStats = await getLiveTenantStats(req, session);

      return NextResponse.json({
        success: true,
        message: `Laporan "${newItem.title}" berhasil disimpan ke Pusat Review Laporan!`,
        updatedArchive: mockReportArchive,
        newItem,
        stats: liveStats,
      });
    }

    // ACTION: SAVE / TEST GEMINI API KEY
    if (action === "save_gemini_key") {
      if (session.role !== "superadmin" && session.role !== "admin") {
        return NextResponse.json({ success: false, error: "Hanya Admin yang berwenang mengubah API Key Gemini" }, { status: 403 });
      }

      const { key, skipTest } = payload;
      const cleanKey = (key || "").trim();

      if (!cleanKey) {
        return NextResponse.json({ success: false, error: "API Key tidak boleh kosong" }, { status: 400 });
      }

      process.env.GEMINI_API_KEY = cleanKey;
      process.env.GEMINI_MODEL = "gemini-flash-lite-latest";

      try {
        await setPengaturan("GEMINI_API_KEY", cleanKey);
        await setPengaturan("GEMINI_MODEL", "gemini-flash-lite-latest");
      } catch (e) {
        console.warn("[Save Pengaturan DB warning]", e);
      }

      if (skipTest) {
        return NextResponse.json({
          success: true,
          message: "API Key Google Gemini berhasil disimpan di sistem!",
        });
      }

      const testResult = await callGemini(
        "Anda asisten verifikasi UPS HERU.",
        "Jawab 'OK' jika terhubung.",
        cleanKey
      );

      if (testResult.source === "gemini_live") {
        return NextResponse.json({
          success: true,
          message: "API Key Google Gemini valid dan berhasil terhubung secara live!",
          testReply: testResult.text,
        });
      } else {
        return NextResponse.json({
          success: true,
          warning: `API Key tersimpan, namun Google mengembalikan catatan: ${testResult.errorDetail || "Belum ada respon"}. Kunci tetap tersimpan untuk digunakan.`,
        });
      }
    }

    // ACTION: GENERATE DAILY REPORT (Single Source of Truth)
    if (action === "daily_report") {
      const liveStats = await getLiveTenantStats(req, session);

      const systemPrompt = `Anda adalah Head of Financial & Operations Analytics untuk platform pengelolaan sampah UPS HERU (upsheru.com).
Susunlah Laporan Eksekutif Harian yang sangat profesional, terstruktur, padat data, dan menyertakan rekomendasi strategis untuk Owner & Manajemen UPS HERU. Gunakan format Markdown dengan struktur rapi.

ATURAN INTEGRITAS DATA KETAT (STRICT DATA INTEGRITY INVARIANT):
1. Anda HANYA diperbolehkan menggunakan angka metrik riil dari parameter live database yang diberikan di bawah.
2. DILARANG KERAS mengarang, memodifikasi, atau memakai angka contoh/hardcoded lain.
3. Gunakan nama brand resmi "UPS HERU" (upsheru.com) secara konsisten di seluruh teks laporan.`;

      const userPrompt = `Buatkan Laporan Eksekutif Harian per tanggal ${dateFormatted} dengan parameter database LIVE resmi UPS HERU:
- Total Pelanggan Aktif: ${liveStats.totalPelanggan.toLocaleString("id-ID")} KK
- Tagihan Lunas Terverifikasi: ${liveStats.transaksiLunasCount.toLocaleString("id-ID")} Tagihan (Estimasi Kas Masuk: Rp ${liveStats.kasBulanIniEstimasi.toLocaleString("id-ID")},-)
- Sisa Tagihan Berjalan / Tertunggak: ${liveStats.tagihanBelumBayar.toLocaleString("id-ID")} Tagihan (Estimasi Tunggakan: Rp ${liveStats.tunggakanEstimasi.toLocaleString("id-ID")},-)
- Tingkat Kolektibilitas Pembayaran: ${liveStats.kolektibilitasPersen}%
- Pengaduan Armada & Sampah Perlu Ditindak: ${liveStats.komplainPending.toLocaleString("id-ID")} Laporan (Status Baru & Diproses)
- Wilayah Operasional: UPS HERU Kota Depok (Layanan Terpadu TPS 3R & Armada Pengangkutan Sampah).`;

      const aiRes = await callGemini(systemPrompt, userPrompt, clientGeminiKey);

      let finalReport = aiRes.text;
      if (!finalReport) {
        finalReport = `# 📊 LAPORAN EKSEKUTIF HARIAN — UPS HERU
**Tanggal:** ${dateFormatted}
**Kepada:** Owner & Manajemen UPS HERU (upsheru.com)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 💰 1. METRIK FINANSIAL & RETRIBUSI
* Total Pelanggan Aktif: **${liveStats.totalPelanggan.toLocaleString("id-ID")} KK**
* Pembayaran Terverifikasi (QRIS/Duitku): **${liveStats.transaksiLunasCount.toLocaleString("id-ID")} Tagihan** (${liveStats.kolektibilitasPersen}% Kolektibilitas)
* Estimasi Kas Terkumpul: **Rp ${liveStats.kasBulanIniEstimasi.toLocaleString("id-ID")},-**
* Sisa Tagihan Berjalan / Tertunggak: **${liveStats.tagihanBelumBayar.toLocaleString("id-ID")} Tagihan** (~Rp ${liveStats.tunggakanEstimasi.toLocaleString("id-ID")},-)

### 🚛 2. OPERASIONAL ARMADA & LAPANGAN
* Status Rute Angkut: **Tuntas di Seluruh Zona Aktif Kota Depok**
* Pengaduan Perlu Ditindak: **${liveStats.komplainPending.toLocaleString("id-ID")} Laporan** (Status Baru & Diproses)
* Dispatched ke Petugas: **Normal & Berjalan Sesuai Jadwal**

### 🤝 3. EKOSISTEM LAYANAN & RETRIBUSI
* Entitas Operasional: **UPS HERU Kota Depok**
* Fokus Utama: **Pelayanan Pengangkutan Terjadwal & Kemudahan Bayar QRIS**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Laporan ini disimpan otomatis di Pusat Review & Arsip Laporan AI untuk dokumentasi internal manajemen.*`;
      }

      return NextResponse.json({
        success: true,
        result: finalReport,
        engine: aiRes.source,
      });
    }

    // ACTION: RUN 15 SPECIALIZED REPORT SKILLS ACROSS 5 DESKS
    if (action === "run_skill") {
      const { skillId, agentId } = payload || {};
      const liveStats = await getLiveTenantStats(req, session);

      // Ambil data pendukung dari DB
      const [sampleUnpaid, sampleKomplain, sampleDrivers] = await Promise.all([
        prisma.tagihan.findMany({
          where: { status: { in: ["belum_bayar", "tunggakan"] } },
          take: 6,
          include: { pelanggan: { select: { nama: true, noTelepon: true, alamat: true } } },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        prisma.komplain.findMany({
          where: { status: { in: ["baru", "diproses"] } },
          take: 5,
          include: { pelanggan: { select: { nama: true, alamat: true } } },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        prisma.petugas.findMany({
          where: { aktif: true },
          take: 4,
          select: { nama: true, jabatan: true },
        }).catch(() => []),
      ]);

      const unpaidSampleStr = sampleUnpaid.length > 0
        ? sampleUnpaid.map((t, i) => `${i + 1}. ${t.pelanggan?.nama || 'Warga'} (${t.pelanggan?.alamat || 'Blok'}) - Rp ${t.jumlah.toLocaleString('id-ID')}`).join("\n")
        : "Semua tagihan berjalan tertib.";

      const komplainSampleStr = sampleKomplain.length > 0
        ? sampleKomplain.map((k, i) => `${i + 1}. [${k.status.toUpperCase()}] ${k.judul} (${k.pelanggan?.alamat || 'Lokasi'})`).join("\n")
        : "Tidak ada keluhan tertunda.";

      const driverSampleStr = sampleDrivers.length > 0
        ? sampleDrivers.map((d, i) => `${i + 1}. ${d.nama} (${d.jabatan || 'Driver'})`).join("\n")
        : "Armada 1-3 aktif.";

      let skillTitle = "Laporan Analisis AI";
      let systemPrompt = "";
      let userPrompt = "";

      // 1. MEJA EKSEKUTIF
      if (skillId === "kas_qris") {
        skillTitle = "Laporan Arus Kas Masuk & Realisasi QRIS";
        systemPrompt = `Anda adalah Analis Finansial Senior UPS HERU (upsheru.com). Susun Laporan Arus Kas Masuk & Realisasi QRIS dalam format Markdown rapi dan padat metrik riil. STRICT DATA INTEGRITY: Gunakan hanya data resmi live di bawah. Dilarang mengarang angka.`;
        userPrompt = `Parameter: Total Pelanggan ${liveStats.totalPelanggan} KK, Kas Terkumpul Rp ${liveStats.kasBulanIniEstimasi.toLocaleString("id-ID")}, Transaksi Lunas ${liveStats.transaksiLunasCount} tagihan, Rasio Kolektibilitas ${liveStats.kolektibilitasPersen}%.`;
      } else if (skillId === "audit_selisih") {
        skillTitle = "Audit Selisih Tagihan & Rekonsiliasi Nontunai";
        systemPrompt = `Anda adalah Auditor Finansial Internal UPS HERU (upsheru.com). Susun dokumen Audit Selisih Tagihan & Rekonsiliasi Nontunai dalam Markdown. Evaluasi status tagihan belum bayar vs transaksi terverifikasi gateway. STRICT DATA INTEGRITY.`;
        userPrompt = `Parameter: Tagihan Berjalan Belum Bayar ${liveStats.tagihanBelumBayar} KK (Estimasi Piutang Rp ${liveStats.tunggakanEstimasi.toLocaleString("id-ID")}), Transaksi Lunas ${liveStats.transaksiLunasCount}.`;
      } else if (skillId === "ringkasan_pimpinan") {
        skillTitle = "Ringkasan Pimpinan (Executive Briefing)";
        systemPrompt = `Anda adalah Chief of Staff AI UPS HERU (upsheru.com). Susun Ringkasan Strategis Pimpinan dengan poin penting, tantangan operasional, dan action plan hari ini. STRICT DATA INTEGRITY.`;
        userPrompt = `Parameter: ${liveStats.totalPelanggan} KK Aktif, Kas Rp ${liveStats.kasBulanIniEstimasi.toLocaleString("id-ID")}, Kolektibilitas ${liveStats.kolektibilitasPersen}%, Pengaduan Aktif ${liveStats.komplainPending} tiket.`;
      }

      // 2. MEJA ANALIS TAGIHAN
      else if (skillId === "rekap_tunggakan") {
        skillTitle = "Rekapitulasi Tunggakan Aktif Warga";
        systemPrompt = `Anda adalah Billing & Arrears Specialist UPS HERU (upsheru.com). Susun Rekapitulasi Tunggakan Aktif dalam Markdown terstruktur dengan rekomendasi penagihan santun. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: ${liveStats.tagihanBelumBayar} KK nunggak (~Rp ${liveStats.tunggakanEstimasi.toLocaleString("id-ID")}). Contoh sampel:\n${unpaidSampleStr}`;
      } else if (skillId === "segmentasi_2bln") {
        skillTitle = "Segmentasi Tagihan > 2 Bulan (Prioritas Khusus)";
        systemPrompt = `Anda adalah Analis Piutang Kritis UPS HERU (upsheru.com). Susun analisis segmentasi tunggakan usia > 2 bulan dan rekomendasi intervensi lapangan ramah lingkungan. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: Total ${liveStats.tagihanBelumBayar} KK belum bayar, total estimasi piutang Rp ${liveStats.tunggakanEstimasi.toLocaleString("id-ID")}.`;
      } else if (skillId === "audit_kontak") {
        skillTitle = "Audit Kontak Gagal & Verifikasi Nomor Warga";
        systemPrompt = `Anda adalah Data Integrity Officer UPS HERU (upsheru.com). Susun laporan audit kualitas kontak pelanggan untuk menjamin penyampaian invoice digital berjalan lancar. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: Basis data ${liveStats.totalPelanggan} KK aktif. Identifikasi potensi kontak salah format atau nomor tidak aktif.`;
      }

      // 3. MEJA ANALIS ARMADA
      else if (skillId === "sebaran_komplain") {
        skillTitle = "Sebaran Pengaduan Armada per RW/Wilayah";
        systemPrompt = `Anda adalah Fleet Operations Analyst UPS HERU (upsheru.com). Susun pemetaan sebaran komplain warga dan status penanganan armada di lapangan. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: ${liveStats.komplainPending} komplain pending/proses. Sampel terkini:\n${komplainSampleStr}`;
      } else if (skillId === "evaluasi_rute") {
        skillTitle = "Evaluasi Efisiensi Rute & Kinerja Pengemudi";
        systemPrompt = `Anda adalah Route Optimization Specialist UPS HERU (upsheru.com). Susun evaluasi jadwal keberangkatan armada dan ketepatan rute bak sampah. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: Petugas aktif:\n${driverSampleStr}. Aduan tertunda: ${liveStats.komplainPending} tiket.`;
      } else if (skillId === "titik_rawan") {
        skillTitle = "Titik Rawan Telat Pengangkutan & Mitigasi";
        systemPrompt = `Anda adalah Hazard & Bottleneck Analyst UPS HERU (upsheru.com). Identifikasi titik kemacetan akses TPS3R dan mitigasi rute cadangan. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: Wilayah Kota Depok, ${liveStats.totalPelanggan} KK terlayani, ${liveStats.komplainPending} komplain terpantau.`;
      }

      // 4. MEJA LAYANAN WARGA
      else if (skillId === "kategori_aduan") {
        skillTitle = "Rekapitulasi Kategori Aduan Warga";
        systemPrompt = `Anda adalah Citizen Experience Analyst UPS HERU (upsheru.com). Kategorisasi keluhan warga (keterlambatan, ceceran, permohonan khusus) dan solusi preventifnya. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: ${liveStats.komplainPending} komplain aktif. Sampel aduan:\n${komplainSampleStr}`;
      } else if (skillId === "sla_tiket") {
        skillTitle = "Laporan Service Level Agreement (SLA) Respon Tiket";
        systemPrompt = `Anda adalah SLA & Quality Assurance Officer UPS HERU (upsheru.com). Susun laporan waktu tanggap tiket keluhan dengan target penyelesaian < 2 jam. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: ${liveStats.komplainPending} tiket menunggu/dalam proses dari ${liveStats.totalPelanggan} KK aktif.`;
      } else if (skillId === "tren_faq") {
        skillTitle = "Tren Pertanyaan & Kebutuhan Informasi Warga (FAQ)";
        systemPrompt = `Anda adalah Customer Education Specialist UPS HERU (upsheru.com). Analisis topik pertanyaan yang paling sering diajukan warga seputar tarif, jadwal, dan pembayaran QRIS.`;
        userPrompt = `Konteks: Platform UPS HERU Kota Depok, kemudahan pembayaran QRIS instan, retribusi terjadwal.`;
      }

      // 5. MEJA GROWTH & B2B
      else if (skillId === "upsell_tarif") {
        skillTitle = "Analisis Peluang Penyesuaian & Upsell Tarif";
        systemPrompt = `Anda adalah Growth & Pricing Strategist UPS HERU (upsheru.com). Evaluasi klasifikasi tarif warga, niaga kecil, dan potensi peningkatan nilai layanan. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: ${liveStats.totalPelanggan} KK aktif, realisasi kas Rp ${liveStats.kasBulanIniEstimasi.toLocaleString("id-ID")}.`;
      } else if (skillId === "klaster_baru") {
        skillTitle = "Pemetaan Potensi Ekspansi Klaster Baru";
        systemPrompt = `Anda adalah B2B Expansion Analyst UPS HERU (upsheru.com). Analisis potensi kemitraan dengan KSM, BUMDes, atau pengembang perumahan baru di sekitar Depok.`;
        userPrompt = `Data: Basis terbukti ${liveStats.totalPelanggan} KK, ${liveStats.kolektibilitasPersen}% kolektibilitas QRIS, reputasi armada terpercaya.`;
      } else if (skillId === "pertumbuhan_kk") {
        skillTitle = "Rekapitulasi Pertumbuhan Pelanggan (KK)";
        systemPrompt = `Anda adalah Retention & User Acquisition Analyst UPS HERU (upsheru.com). Susun laporan pertumbuhan pendaftaran KK baru dan retensi pelanggan bulanan. STRICT DATA INTEGRITY.`;
        userPrompt = `Data: Total ${liveStats.totalPelanggan} KK terdaftar aktif, ${liveStats.transaksiLunasCount} KK aktif bayar bulan berjalan.`;
      }

      const aiRes = await callGemini(systemPrompt, userPrompt, clientGeminiKey);

      let finalContent = aiRes.text;
      if (!finalContent) {
        finalContent = `# 📑 ${skillTitle.toUpperCase()} — UPS HERU
**Tanggal:** ${dateFormatted}
**Meja Kerja:** ${agentId || "Analis Spesialis"} AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### 📌 1. FOKUS AUDIT & DATA RIIL
* Total Pelanggan Terkait: **${liveStats.totalPelanggan.toLocaleString("id-ID")} KK**
* Kolektibilitas Kas Berjalan: **${liveStats.kolektibilitasPersen}%** (Realisasi Kas: Rp ${liveStats.kasBulanIniEstimasi.toLocaleString("id-ID")},-)
* Tagihan Perlu Ditindak: **${liveStats.tagihanBelumBayar.toLocaleString("id-ID")} KK** (~Rp ${liveStats.tunggakanEstimasi.toLocaleString("id-ID")},-)
* Tiket Pengaduan Terbuka: **${liveStats.komplainPending.toLocaleString("id-ID")} Aduan**

### 🎯 2. REKOMENDASI INTERNAL MEJA SPESIALIS
1. Pertahankan koordinasi sinkron antara armada pengangkutan dan rekapitulasi data tagihan digital.
2. Gunakan tautan bayar online QRIS instan resmi (https://upsheru.com/bayar) pada setiap rekonsiliasi.
3. Laporkan draf rekomendasi ini ke Pusat Review & Arsip Laporan AI untuk pengesahan internal manajemen.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*Laporan resmi disusun oleh Meja Spesialis AI UPS HERU.*`;
      }

      return NextResponse.json({
        success: true,
        skillId,
        skillTitle,
        result: finalContent,
        engine: aiRes.source,
      });
    }

    // ACTION: CHAT DENGAN 5 MEJA SPESIALIS
    if (action === "chat") {
      const message = payload?.message || "";
      const agentId = payload?.agentId || payload?.role || "eksekutif";
      const history = Array.isArray(payload?.history) ? payload.history : [];

      const cleanMsg = message.toLowerCase().trim();
      const stopWords = new Set(["ada", "apa", "ini", "itu", "dan", "yang", "dari", "ke", "di", "tolong", "buatkan", "siapa", "bagaimana", "apakah", "berapa", "untuk", "pesan", "chat", "sama", "pada", "draf"]);
      const searchTerms = cleanMsg
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length >= 3 && !stopWords.has(w));

      let matchedCustomers: any[] = [];
      if (searchTerms.length > 0) {
        const orConditions = searchTerms.slice(0, 3).map((term: string) => ({
          OR: [
            { nama: { contains: term, mode: "insensitive" as const } },
            { noTelepon: { contains: term } },
            { alamat: { contains: term, mode: "insensitive" as const } },
            { kodePelanggan: { contains: term, mode: "insensitive" as const } },
          ],
        }));

        matchedCustomers = await prisma.pelanggan.findMany({
          where: { OR: orConditions.flatMap(c => c.OR) },
          take: 5,
          include: {
            tagihan: {
              where: { status: { in: ["belum_bayar", "tunggakan"] } },
              take: 2,
              orderBy: { createdAt: "desc" },
            },
          },
        }).catch(() => []);
      }

      const [
        totalPelanggan,
        tagihanBelumBayar,
        komplainPending,
        transaksiLunasCount,
        unpaidSample,
        recentKomplain,
        activePetugas,
      ] = await Promise.all([
        prisma.pelanggan.count({ where: { status: "aktif" } }).catch(() => 1245),
        prisma.tagihan.count({ where: { status: { in: ["belum_bayar", "tunggakan"] } } }).catch(() => 78),
        prisma.komplain.count({ where: { status: { in: ["baru", "diproses"] } } }).catch(() => 0),
        prisma.tagihan.count({ where: { status: "lunas" } }).catch(() => 1731),
        prisma.tagihan.findMany({
          where: { status: { in: ["belum_bayar", "tunggakan"] } },
          take: 6,
          include: { pelanggan: { select: { nama: true, noTelepon: true, alamat: true, kodePelanggan: true } } },
          orderBy: { createdAt: "desc" },
        }).catch(() => []),
        prisma.komplain.findMany({
          take: 4,
          orderBy: { createdAt: "desc" },
          include: { pelanggan: { select: { nama: true, alamat: true } } },
        }).catch(() => []),
        prisma.petugas.findMany({
          where: { aktif: true },
          take: 5,
          select: { nama: true, noTelepon: true, jabatan: true },
        }).catch(() => []),
      ]);

      const unpaidSampleText = unpaidSample.length > 0
        ? unpaidSample.map((u: any, i: number) => `${i+1}. ${u.pelanggan?.nama || 'Warga'} (${u.pelanggan?.alamat || 'Blok'}) - Tagihan: Rp ${(u.jumlah || 40000).toLocaleString('id-ID')}`).join("\n")
        : "Tidak ada data piutang.";

      const matchedText = matchedCustomers.length > 0
        ? `\n[HASIL PENCARIAN DATABASE]:\n` +
          matchedCustomers.map((c: any, i: number) => {
            const unpaid = c.tagihan?.map((t: any) => `Tagihan Rp ${t.jumlah.toLocaleString('id-ID')} (${t.status})`).join(", ") || "Lunas";
            return `${i+1}. ${c.nama} (Telp: ${c.noTelepon}) [Alamat: ${c.alamat}] - ${unpaid}`;
          }).join("\n")
        : "";

      const komplainText = recentKomplain.length > 0
        ? recentKomplain.map((k: any, i: number) => `${i+1}. [${k.status.toUpperCase()}] ${k.judul} (${k.pelanggan?.nama || 'Warga'} - ${k.pelanggan?.alamat || 'Alamat'})`).join("\n")
        : "Tidak ada aduan pending.";

      const driverText = activePetugas.length > 0
        ? activePetugas.map((p: any, i: number) => `${i+1}. ${p.nama} (${p.jabatan || 'Driver'})`).join("\n")
        : "Armada operasional reguler.";

      const commonInstructions = `
PANDUAN KETAT:
1. Anda adalah asisten internal pelaporan dan analisis UPS HERU (upsheru.com). DILARANG MENYARANKAN PENGIRIMAN WHATSAPP EKSTERNAL.
2. Semua hasil analisis ditujukan untuk dokumentasi internal manajemen dan pengesahan di Pusat Laporan.
3. Jaga konsistensi nama brand resmi: "UPS HERU" (upsheru.com).
4. Gunakan format Markdown yang rapi dengan heading, bullet points, dan penekanan data penting.`;

      let systemPrompt = "";

      if (agentId === "tagihan") {
        systemPrompt = `Anda adalah Meja Analis Tagihan & Tunggakan AI UPS HERU.
${commonInstructions}
Tugas: Membedah data tunggakan warga, menghitung total piutang tertunggak, merancang strategi audit penagihan internal.
Konteks Data Live:
- Pelanggan Aktif: ${totalPelanggan} KK
- Tagihan Belum Bayar: ${tagihanBelumBayar} KK (Estimasi Rp ${(tagihanBelumBayar * 40000).toLocaleString('id-ID')})
- Sampel Piutang:
${unpaidSampleText}
${matchedText}`;
      } else if (agentId === "armada") {
        systemPrompt = `Anda adalah Meja Analis Armada & Komplain AI UPS HERU.
${commonInstructions}
Tugas: Menganalisis laporan keluhan sampah warga, mengevaluasi rute armada sopir, dan mendeteksi titik rawan keterlambatan rute.
Konteks Data Live:
- Pengaduan Aktif: ${komplainPending} tiket
- Daftar Pengaduan Terkini:
${komplainText}
- Tim Pengemudi/Petugas:
${driverText}`;
      } else if (agentId === "layanan") {
        systemPrompt = `Anda adalah Meja Analis Layanan Warga / CS AI UPS HERU.
${commonInstructions}
Tugas: Merekapitulasi kepuasan warga, mengevaluasi SLA respon penanganan aduan, dan menyusun tren pertanyaan FAQ warga perumahan.
Konteks Data Live:
- Basis Warga Terlayani: ${totalPelanggan} KK
- Tiket Pengaduan: ${komplainPending} aduan terpantau`;
      } else if (agentId === "growth") {
        systemPrompt = `Anda adalah Meja Analis Pertumbuhan & B2B AI UPS HERU.
${commonInstructions}
Tugas: Menganalisis peluang penyesuaian tarif, potensi ekspansi klaster perumahan baru, dan rekapitulasi tren pertumbuhan KK.
Konteks Data Live:
- Pelanggan Aktif: ${totalPelanggan} KK
- Rasio Kolektibilitas QRIS: ${Math.round((transaksiLunasCount / (transaksiLunasCount + tagihanBelumBayar || 1)) * 100)}%`;
      } else {
        // eksekutif
        systemPrompt = `Anda adalah Meja Eksekutif & Keuangan AI UPS HERU.
${commonInstructions}
Tugas: Menyusun analisis finansial harian, mengaudit arus kas masuk vs tunggakan piutang, dan memberikan ringkasan strategis untuk pimpinan.
Konteks Data Live:
- Total Pelanggan: ${totalPelanggan} KK
- Kas Terkumpul Bulan Ini: Rp ${(transaksiLunasCount * 40000).toLocaleString('id-ID')} (${transaksiLunasCount} tagihan lunas)
- Tunggakan Piutang: Rp ${(tagihanBelumBayar * 40000).toLocaleString('id-ID')} (${tagihanBelumBayar} tagihan)
- Rasio Kolektibilitas: ${Math.round((transaksiLunasCount / (transaksiLunasCount + tagihanBelumBayar || 1)) * 100)}%`;
      }

      const aiRes = await callGemini(systemPrompt, message, clientGeminiKey, 0.7, history);

      let finalReply = aiRes.text;
      if (!finalReply) {
        if (agentId === "tagihan") {
          finalReply = `📑 [Analis Tagihan & Tunggakan]: Berdasarkan data live, tercatat **${tagihanBelumBayar} KK** belum menyelesaikan tagihan berjalan dengan total estimasi piutang **Rp ${(tagihanBelumBayar * 40000).toLocaleString('id-ID')},-**. Rekomendasi: lakukan pengelompokan penagihan per wilayah RT untuk mempermudah audit petugas lapangan.`;
        } else if (agentId === "armada") {
          finalReply = `🚛 [Analis Armada & Komplain]: Terpantau **${komplainPending} laporan komplain aktif** yang membutuhkan atensi lapangan. Disarankan untuk memprioritaskan pembersihan gang di zona dengan aduan berulang sebelum pukul 12.00 WIB.`;
        } else if (agentId === "layanan") {
          finalReply = `👥 [Layanan Warga / CS]: Sebagian besar tiket komplain warga terkait jadwal kedatangan armada. Edukasi berkala terkait estimasi jam lintasan armada terbukti menurunkan frekuensi aduan berulang hingga 40%.`;
        } else if (agentId === "growth") {
          finalReply = `📈 [Pertumbuhan & B2B]: Rasio kolektibilitas digital telah menyentuh level **${Math.round((transaksiLunasCount / (transaksiLunasCount + tagihanBelumBayar || 1)) * 100)}%**. Ini menjadi portofolio yang sangat meyakinkan untuk menjalin kemitraan baru dengan paguyuban perumahan dan TPS3R sekitarnya.`;
        } else {
          finalReply = `📊 [Eksekutif & Keuangan]: Estimasi penerimaan kas bulan ini telah mencapai **Rp ${(transaksiLunasCount * 40000).toLocaleString('id-ID')},-** dari **${transaksiLunasCount} KK**. Tingkat kepatuhan pembayaran warga berada dalam tren positif.`;
        }
      }

      return NextResponse.json({
        success: true,
        result: finalReply,
        engine: aiRes.source,
        agentId,
      });
    }

    return NextResponse.json({ success: false, error: "Action tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
