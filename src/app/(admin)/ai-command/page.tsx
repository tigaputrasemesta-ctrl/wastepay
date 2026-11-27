"use client";

import React, { useState, useEffect, useRef } from "react";
import MarkdownReportView from "@/components/admin/MarkdownReportView";
import VirtualCommandRoom, {
  AgentId,
  AgentStatus,
  ActivityLog,
  AGENT_DESKS,
} from "@/components/admin/VirtualCommandRoom";
import {
  Sparkles,
  Send,
  FileText,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Users,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Edit3,
  Lock,
  Key,
  Zap,
  Save,
  FileCheck2,
  Printer,
  Archive,
  Receipt,
  Truck,
  Headphones,
  BookmarkPlus,
  Clock,
  Layers,
} from "lucide-react";

interface Stats {
  totalPelanggan: number;
  komplainPending: number;
  tagihanBelumBayar: number;
  totalMitra: number;
  transaksiLunasCount: number;
  kasBulanIniEstimasi: number;
  tunggakanEstimasi: number;
  kolektibilitasPersen?: number;
  pendingReviewCount?: number;
  archivedCount?: number;
}

interface ReportArchiveItem {
  id: string;
  agentId: AgentId;
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

interface SkillItem {
  id: string;
  title: string;
  description: string;
}

interface ChatMessage {
  sender: "owner" | "ai";
  text: string;
  time: string;
  role?: AgentId;
  canSaveReport?: boolean;
  reportTitle?: string;
}

export default function AiCommandHubPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reportArchive, setReportArchive] = useState<ReportArchiveItem[]>([]);
  const [hasServerGeminiKey, setHasServerGeminiKey] = useState(false);
  const [clientGeminiKey, setClientGeminiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [testingKey, setTestingKey] = useState(false);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [engineSource, setEngineSource] = useState<"gemini_live" | "fallback">("fallback");

  const [activeAgent, setActiveAgent] = useState<AgentId>("eksekutif");
  const [agentStatuses, setAgentStatuses] = useState<Record<AgentId, AgentStatus>>({
    eksekutif: "active",
    tagihan: "active",
    armada: "active",
    layanan: "active",
    growth: "active",
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([
    {
      id: "log-1",
      time: "18:00:00",
      text: "Sistem AI Command Room aktif. 5 Meja Spesialis terhubung ke Pusat Laporan.",
      type: "info",
    },
    {
      id: "log-2",
      time: "18:15:30",
      text: "Meja Eksekutif memperbarui audit kas & estimasi penerimaan QRIS berjalan.",
      type: "success",
    },
  ]);

  const addActivityLog = (text: string, type: "info" | "success" | "warning" = "info") => {
    const timeNow = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setActivityLogs((prev) => [{ id: `${Date.now()}`, time: timeNow, text, type }, ...prev.slice(0, 8)]);
  };

  const deskDetails: Record<
    AgentId,
    {
      skills: SkillItem[];
      prompts: string[];
      greeting: string;
    }
  > = {
    eksekutif: {
      skills: [
        { id: "kas_qris", title: "Laporan Kas & QRIS", description: "Audit penerimaan kas & adopsi QRIS" },
        { id: "audit_selisih", title: "Audit Selisih Tagihan", description: "Rekonsiliasi transaksi vs kas" },
        { id: "ringkasan_pimpinan", title: "Ringkasan Pimpinan", description: "Briefing strategis harian" },
      ],
      prompts: [
        "Analisis performa finansial & realisasi QRIS hari ini",
        "Berapa estimasi kas masuk jika semua tunggakan tertagih?",
        "Susun rekomendasi efisiensi operasional manajemen",
      ],
      greeting:
        "Halo Pimpinan! Saya Meja Eksekutif & Keuangan AI. Saya memantau arus kas masuk, rasio kolektibilitas QRIS, dan menyajikan ringkasan strategis untuk evaluasi manajemen.",
    },
    tagihan: {
      skills: [
        { id: "rekap_tunggakan", title: "Rekap Tunggakan Aktif", description: "Rincian KK berstatus piutang" },
        { id: "segmentasi_2bln", title: "Segmentasi > 2 Bulan", description: "Kelompok tunggakan prioritas" },
        { id: "audit_kontak", title: "Audit Kontak Gagal", description: "Verifikasi nomor WhatsApp warga" },
      ],
      prompts: [
        "Tampilkan rekap warga belum bayar dan total nominalnya",
        "Berapa KK yang memiliki tunggakan lebih dari 2 bulan?",
        "Bagaimana saran strategi verifikasi kontak warga yang tidak aktif?",
      ],
      greeting:
        "Halo! Saya Meja Analis Tagihan & Tunggakan AI. Saya terhubung ke basis data piutang warga untuk menganalisis risiko keterlambatan dan memetakan segmentasi tagihan.",
    },
    armada: {
      skills: [
        { id: "sebaran_komplain", title: "Sebaran Komplain RW", description: "Pemetaan keluhan sampah per zona" },
        { id: "evaluasi_rute", title: "Evaluasi Rute Sopir", description: "Ketepatan jadwal lintasan truk" },
        { id: "titik_rawan", title: "Titik Rawan Telat", description: "Deteksi bottleneck jalan & TPS3R" },
      ],
      prompts: [
        "Bagaimana sebaran aduan sampah di zona Sawangan hari ini?",
        "Evaluasi kinerja dan rute armada pengangkut aktif",
        "Identifikasi titik jalan yang sering menghambat jam angkut",
      ],
      greeting:
        "Halo! Saya Meja Analis Armada & Komplain AI. Tugas saya mengevaluasi efisiensi rute sopir, memantau titik keterlambatan, dan merekap tiket aduan warga dari lapangan.",
    },
    layanan: {
      skills: [
        { id: "kategori_aduan", title: "Rekap Kategori Aduan", description: "Klasifikasi keluhan yang masuk" },
        { id: "sla_tiket", title: "Laporan SLA Tiket", description: "Kecepatan tindak lanjut petugas" },
        { id: "tren_faq", title: "Tren Pertanyaan FAQ", description: "Kebutuhan informasi utama warga" },
      ],
      prompts: [
        "Klasifikasikan jenis keluhan warga yang paling dominan",
        "Berapa rata-rata durasi penyelesaian tiket komplain saat ini?",
        "Apa saja 3 pertanyaan yang paling sering ditanyakan warga?",
      ],
      greeting:
        "Halo! Saya Meja Analis Layanan Warga / CS AI. Saya menganalisis kepuasan pelanggan, waktu tanggap SLA tiket, dan menyusun tren pertanyaan warga terkait retribusi.",
    },
    growth: {
      skills: [
        { id: "upsell_tarif", title: "Peluang Upsell Tarif", description: "Optimalisasi klasifikasi retribusi" },
        { id: "klaster_baru", title: "Potensi Klaster Baru", description: "Peluang ekspansi perumahan/desa" },
        { id: "pertumbuhan_kk", title: "Rekap Pertumbuhan KK", description: "Pertambahan warga terdaftar" },
      ],
      prompts: [
        "Analisis potensi penyesuaian tarif bagi segmen niaga kecil",
        "Di mana potensi klaster perumahan baru untuk ekspansi UPS HERU?",
        "Tampilkan tren pertumbuhan KK aktif dalam 3 bulan terakhir",
      ],
      greeting:
        "Halo! Saya Meja Analis Pertumbuhan & B2B AI. Fokus saya adalah mengidentifikasi peluang penyesuaian tarif, pertumbuhan KK baru, dan potensi kemitraan dengan pengelola sampah mandiri.",
    },
  };

  const [chatHistories, setChatHistories] = useState<Record<AgentId, ChatMessage[]>>({
    eksekutif: [
      {
        sender: "ai",
        text: deskDetails.eksekutif.greeting,
        time: "Baru saja",
        role: "eksekutif",
        canSaveReport: false,
      },
    ],
    tagihan: [
      {
        sender: "ai",
        text: deskDetails.tagihan.greeting,
        time: "Baru saja",
        role: "tagihan",
        canSaveReport: false,
      },
    ],
    armada: [
      {
        sender: "ai",
        text: deskDetails.armada.greeting,
        time: "Baru saja",
        role: "armada",
        canSaveReport: false,
      },
    ],
    layanan: [
      {
        sender: "ai",
        text: deskDetails.layanan.greeting,
        time: "Baru saja",
        role: "layanan",
        canSaveReport: false,
      },
    ],
    growth: [
      {
        sender: "ai",
        text: deskDetails.growth.greeting,
        time: "Baru saja",
        role: "growth",
        canSaveReport: false,
      },
    ],
  });

  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Deliverable Canvas state
  const [activeOutputTitle, setActiveOutputTitle] = useState("Laporan Eksekutif Harian");
  const [activeOutputContent, setActiveOutputContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Moderation / Archive Section State
  const [archiveTab, setArchiveTab] = useState<"pending" | "archived">("pending");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistories, activeAgent, isChatting]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("upsheru_gemini_key") || "";
      if (savedKey) {
        setClientGeminiKey(savedKey);
        setKeyInput(savedKey);
        fetch("/api/ai-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_gemini_key", payload: { key: savedKey, skipTest: true } }),
        }).catch(() => {});
      }
    }
    fetchData();
    handleTriggerDailyReport();
  }, []);

  const getHeaders = () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (clientGeminiKey) {
      headers["x-gemini-key"] = clientGeminiKey;
    }
    return headers;
  };

  const fetchData = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/ai-command", { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setHasServerGeminiKey(data.hasGeminiKey);
        if (data.reportArchive) {
          setReportArchive(data.reportArchive);
        }
        const timeNow = new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setLastRefreshed(timeNow);
      }
    } catch (e) {
      console.error("Gagal load data:", e);
      setNotification("❌ Gagal memuat data metrik terbaru.");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleTogglePause = (id: AgentId) => {
    setAgentStatuses((prev) => {
      const current = prev[id];
      const nextStatus: AgentStatus = current === "paused" ? "active" : "paused";
      const deskName = AGENT_DESKS[id].shortTitle;
      addActivityLog(
        nextStatus === "paused"
          ? `${deskName} dijeda oleh Admin. Tidak menerima permintaan otomatis.`
          : `${deskName} diaktifkan kembali dan siap memproses data.`,
        nextStatus === "paused" ? "warning" : "info"
      );
      return { ...prev, [id]: nextStatus };
    });
  };

  const handleSaveDirect = async () => {
    const key = keyInput.trim();
    if (!key) return;

    setClientGeminiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("upsheru_gemini_key", key);
    }

    try {
      await fetch("/api/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_gemini_key", payload: { key, skipTest: true } }),
      });
    } catch (e) {
      console.warn("Server save error:", e);
    }

    setNotification("✅ API Key Google Gemini berhasil disimpan di sistem!");
    setShowKeyModal(false);
    fetchData();
  };

  const handleSaveAndTestKey = async () => {
    const key = keyInput.trim();
    if (!key) return;

    setTestingKey(true);
    setClientGeminiKey(key);
    if (typeof window !== "undefined") {
      localStorage.setItem("upsheru_gemini_key", key);
    }

    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_gemini_key", payload: { key, skipTest: false } }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.warning) {
          setNotification("⚠️ " + data.warning);
        } else {
          setNotification("✅ API Key Google Gemini valid dan berhasil terhubung secara live!");
        }
        setShowKeyModal(false);
        fetchData();
      } else {
        setNotification("❌ " + (data.error || "Gagal menghubungkan API Key"));
      }
    } catch (e: any) {
      setNotification("Catatan: " + e.message);
    } finally {
      setTestingKey(false);
    }
  };

  const handleTriggerDailyReport = async () => {
    setLoadingAction(true);
    setNotification(null);
    setActiveOutputTitle("📊 Laporan Eksekutif Harian (Single Source of Truth)");
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "daily_report", payload: { geminiApiKey: clientGeminiKey } }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setActiveOutputContent(data.result);
        if (data.engine) setEngineSource(data.engine);
        addActivityLog("Laporan Eksekutif Harian berhasil disusun dengan data database live.", "success");
      }
    } catch (e) {
      console.error("Error trigger daily report:", e);
    } finally {
      setLoadingAction(false);
    }
  };

  // Run 1 of the 15 Skills
  const handleRunSkill = async (skill: SkillItem) => {
    if (agentStatuses[activeAgent] === "paused") {
      setNotification(`⚠️ ${AGENT_DESKS[activeAgent].title} sedang dijeda. Aktifkan meja terlebih dahulu.`);
      return;
    }

    setLoadingAction(true);
    setNotification(null);
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    // Tambah prompt ke chat
    setChatHistories((prev) => ({
      ...prev,
      [activeAgent]: [
        ...(prev[activeAgent] || []),
        {
          sender: "owner",
          text: `Jalankan skill: **${skill.title}** (${skill.description})`,
          time: timeNow,
          role: activeAgent,
        },
      ],
    }));

    setIsChatting(true);
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "run_skill",
          payload: {
            skillId: skill.id,
            agentId: activeAgent,
            geminiApiKey: clientGeminiKey,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setActiveOutputTitle(`📑 ${data.skillTitle || skill.title}`);
        setActiveOutputContent(data.result);
        if (data.engine) setEngineSource(data.engine);

        setChatHistories((prev) => ({
          ...prev,
          [activeAgent]: [
            ...(prev[activeAgent] || []),
            {
              sender: "ai",
              text: data.result,
              time: timeNow,
              role: activeAgent,
              canSaveReport: true,
              reportTitle: data.skillTitle || skill.title,
            },
          ],
        }));

        setAgentStatuses((prev) => ({ ...prev, [activeAgent]: "new_report" }));
        addActivityLog(`${AGENT_DESKS[activeAgent].shortTitle} menyelesaikan analisis "${skill.title}".`, "success");
      } else {
        setNotification("Gagal menjalankan skill: " + (data.error || "Cek koneksi"));
      }
    } catch (e: any) {
      setNotification("Error: " + e.message);
    } finally {
      setLoadingAction(false);
      setIsChatting(false);
    }
  };

  // Save report to Pusat Review & Arsip
  const handleSaveToArchive = async (contentToSave: string, customTitle?: string) => {
    if (!contentToSave.trim()) return;
    setLoadingAction(true);
    try {
      const currentDesk = AGENT_DESKS[activeAgent];
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "create_report_item",
          payload: {
            agentId: activeAgent,
            agentTitle: currentDesk.title,
            category: "Laporan Internal",
            title: customTitle || activeOutputTitle || `Laporan Analisis ${currentDesk.shortTitle}`,
            summary: `Hasil analisis live disusun oleh ${currentDesk.title}`,
            content: contentToSave,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message || "✅ Laporan berhasil disimpan ke Pusat Review & Arsip!");
        if (data.updatedArchive) setReportArchive([...data.updatedArchive]);
        if (data.stats) setStats(data.stats);
        addActivityLog(`Dokumen baru disimpan ke antrean review oleh ${currentDesk.shortTitle}.`, "success");
      } else {
        setNotification("❌ Gagal menyimpan laporan: " + data.error);
      }
    } catch (e: any) {
      setNotification("Error: " + e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Archive & validate report item
  const handleArchiveReport = async (id: string) => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "archive_report", payload: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message);
        if (data.updatedArchive) setReportArchive([...data.updatedArchive]);
        if (data.stats) setStats(data.stats);
        addActivityLog(`Laporan #${id} telah disahkan & masuk ke Arsip Terverifikasi.`, "success");
      } else {
        setNotification("Gagal mengesahkan: " + data.error);
      }
    } catch (err: any) {
      setNotification("Error: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // Delete draft report
  const handleDeleteReport = async (id: string) => {
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "delete_report", payload: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message);
        if (data.updatedArchive) setReportArchive([...data.updatedArchive]);
        if (data.stats) setStats(data.stats);
        addActivityLog(`Draf laporan #${id} dihapus dari antrean review.`, "info");
      }
    } catch (err: any) {
      setNotification("Error: " + err.message);
    }
  };

  // Save inline edit
  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "update_draft",
          payload: { id, newText: editedText, newTitle: editedTitle },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message);
        if (data.updatedArchive) setReportArchive([...data.updatedArchive]);
        setEditingItemId(null);
        addActivityLog(`Isi draf laporan #${id} disesuaikan oleh Admin.`, "info");
      }
    } catch (err: any) {
      setNotification("Error: " + err.message);
    }
  };

  const handleCopyText = (text: string, title?: string) => {
    if (!text) return;
    const fullText = title ? `${title}\n\n${text}` : text;
    navigator.clipboard.writeText(fullText);
    setNotification("📋 Teks laporan berhasil disalin ke clipboard!");
  };

  const handleResetChat = () => {
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const desk = AGENT_DESKS[activeAgent];
    setChatHistories((prev) => ({
      ...prev,
      [activeAgent]: [
        {
          sender: "ai",
          text: `Sesi percakapan **${desk.title}** telah di-reset. Seluruh konteks telah dibersihkan. Silakan mulai instruksi baru.`,
          time: timeNow,
          role: activeAgent,
          canSaveReport: false,
        },
      ],
    }));
    addActivityLog(`Sesi chat ${desk.shortTitle} di-reset.`, "info");
  };

  const handleSendChat = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = (customMsg || chatInput).trim();
    if (!userMsg || isChatting) return;

    if (agentStatuses[activeAgent] === "paused") {
      setNotification(`⚠️ ${AGENT_DESKS[activeAgent].title} sedang dijeda. Aktifkan meja terlebih dahulu.`);
      return;
    }

    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const currentMessages = chatHistories[activeAgent] || [];

    const historyPayload = currentMessages.slice(-10).map((m) => ({
      role: m.sender === "owner" ? ("user" as const) : ("model" as const),
      text: m.text,
    }));

    setChatHistories((prev) => ({
      ...prev,
      [activeAgent]: [
        ...(prev[activeAgent] || []),
        { sender: "owner", text: userMsg, time: timeNow, role: activeAgent },
      ],
    }));
    setChatInput("");
    setIsChatting(true);

    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "chat",
          payload: {
            message: userMsg,
            geminiApiKey: clientGeminiKey,
            agentId: activeAgent,
            history: historyPayload,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setChatHistories((prev) => ({
          ...prev,
          [activeAgent]: [
            ...(prev[activeAgent] || []),
            {
              sender: "ai",
              text: data.result,
              time: timeNow,
              role: activeAgent,
              canSaveReport: true,
              reportTitle: `Analisis dari ${AGENT_DESKS[activeAgent].title}`,
            },
          ],
        }));
        setActiveOutputTitle(`Analisis dari ${AGENT_DESKS[activeAgent].title}`);
        setActiveOutputContent(data.result);
      } else {
        setChatHistories((prev) => ({
          ...prev,
          [activeAgent]: [
            ...(prev[activeAgent] || []),
            {
              sender: "ai",
              text: data.error
                ? `⚠️ Sistem: ${data.error}`
                : "Instruksi diterima, namun terjadi kendala respon dari server.",
              time: timeNow,
              role: activeAgent,
              canSaveReport: false,
            },
          ],
        }));
      }
    } catch (err: any) {
      setChatHistories((prev) => ({
        ...prev,
        [activeAgent]: [
          ...(prev[activeAgent] || []),
          {
            sender: "ai",
            text: `⚠️ Kendala jaringan: ${err.message || "Gagal menghubungi server"}`,
            time: timeNow,
            role: activeAgent,
            canSaveReport: false,
          },
        ],
      }));
    } finally {
      setIsChatting(false);
    }
  };

  const handleCopyCanvas = () => {
    if (!activeOutputContent) return;
    navigator.clipboard.writeText(activeOutputContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintCanvas = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const isGeminiConnected = hasServerGeminiKey || Boolean(clientGeminiKey && clientGeminiKey.length > 5);

  const pendingReports = reportArchive.filter((q) => q.status === "PENDING_REVIEW");
  const archivedReports = reportArchive.filter((q) => q.status === "ARCHIVED");
  const displayedReports = archiveTab === "pending" ? pendingReports : archivedReports;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl shadow-sm">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AI Virtual Command Room & Pusat Laporan
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> Mode Pelaporan Internal (Tanpa WA)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">
            Pusat analitik operasional terpadu UPS HERU dengan 5 Meja Kerja Agen Virtual dan Pusat Review & Arsip Laporan manajemen.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
          {lastRefreshed && (
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono hidden sm:inline-block whitespace-nowrap">
              Diperbarui: {lastRefreshed}
            </span>
          )}

          {isGeminiConnected ? (
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              Gemini Terhubung Permanen
            </button>
          ) : (
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition animate-pulse whitespace-nowrap"
            >
              <Key className="w-3.5 h-3.5 text-amber-700" />
              Hubungkan Gemini API Key
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loadingStats}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-slate-700 dark:text-zinc-300 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin text-emerald-700" : ""}`} />
            <span>{loadingStats ? "Memuat..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {/* Modal Masukkan Gemini API Key */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Pengaturan Google Gemini API Key
                </h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              API Key Google Gemini disimpan secara permanen di Database Server PostgreSQL. Setiap kali Anda atau admin lain login dari browser maupun perangkat manapun, sistem akan langsung otomatis terhubung. Dapatkan key gratis di{" "}
              <a
                href="https://aistudio.google.com/"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 underline font-semibold"
              >
                aistudio.google.com
              </a>
              .
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Google Gemini API Key:
              </label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Tempel API Key di sini (AIzaSy...)"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-xs rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveDirect}
                disabled={!keyInput.trim()}
                className="px-3.5 py-1.5 text-xs rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                Simpan Langsung
              </button>
              <button
                onClick={handleSaveAndTestKey}
                disabled={testingKey || !keyInput.trim()}
                className="px-4 py-1.5 text-xs rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold flex items-center gap-1.5 transition"
              >
                {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {testingKey ? "Menguji..." : "Simpan & Uji Live"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 KPI METRIC CARDS (Single Source of Truth) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Total Pelanggan Aktif</p>
            <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {loadingStats ? "..." : (stats?.totalPelanggan || 0).toLocaleString("id-ID") + " KK"}
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 font-medium">
              Kolektibilitas QRIS: {stats?.kolektibilitasPersen || 88}%
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Sisa Tunggakan</p>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
              {loadingStats ? "..." : (stats?.tagihanBelumBayar || 0).toLocaleString("id-ID") + " Tagihan"}
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 font-medium">
              ~Rp {stats ? stats.tunggakanEstimasi.toLocaleString("id-ID") : "..."}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Pengaduan Aktif</p>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {loadingStats ? "..." : (stats?.komplainPending || 0).toLocaleString("id-ID") + " Laporan"}
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 font-medium">
              Baru & diproses • Pantauan live
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-gray-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Pusat Arsip Laporan</p>
            <FileCheck2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
              {pendingReports.length} Menunggu
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1 font-medium">
              {archivedReports.length} Laporan Telah Diarsipkan
            </p>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* 1. VIRTUAL COMMAND ROOM (SVG Isometric 5 Desks & Central Console) */}
      <VirtualCommandRoom
        activeAgent={activeAgent}
        onSelectAgent={(id) => setActiveAgent(id)}
        agentStatuses={agentStatuses}
        onTogglePause={handleTogglePause}
        pendingReportCount={pendingReports.length}
        archivedReportCount={archivedReports.length}
        activityLogs={activityLogs}
      />

      {/* 2. DUAL WORKSPACE: 15 SKILL + CHAT PER MEJA & DELIVERABLE CANVAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: 15 Skills & Chat Console for Active Desk (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 flex flex-col min-h-[580px] h-[640px] shadow-sm overflow-hidden">
          {/* Header Desk Console */}
          <div className="p-3.5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {AGENT_DESKS[activeAgent].title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 dark:text-zinc-300 font-mono">
                {isGeminiConnected ? "Gemini Live" : "Fallback Engine"}
              </span>
              <span className={`inline-block w-2 h-2 rounded-full ${isGeminiConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Sesi Percakapan Meja Ini"
                className="ml-1 p-1 rounded-lg text-slate-500 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 SKILL LAPORAN SIAP KLIK KHUSUS MEJA AKTIF */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-zinc-950/40 border-b border-gray-200 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-300">
                ⚡ 3 Skill Laporan Siap Klik:
              </span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400">Klik untuk susun laporan otomatis</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {deskDetails[activeAgent].skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => handleRunSkill(skill)}
                  disabled={loadingAction || isChatting}
                  title={skill.description}
                  className="px-2 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition shadow-sm group disabled:opacity-50"
                >
                  <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 group-hover:underline truncate">
                    {skill.title}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    {skill.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Log per Meja */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs bg-white dark:bg-zinc-900">
            {(chatHistories[activeAgent] || []).map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === "owner" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3 leading-relaxed ${
                    msg.sender === "owner"
                      ? "bg-emerald-700 text-white rounded-br-none"
                      : "bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 rounded-bl-none border border-slate-200/80 dark:border-zinc-700/80"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Tombol Simpan ke Pusat Laporan (Hanya muncul jika canSaveReport === true) */}
                  {msg.sender === "ai" && msg.canSaveReport && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-zinc-700/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveToArchive(msg.text, msg.reportTitle)}
                        disabled={loadingAction}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition shadow-sm"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        + Simpan ke Pusat Laporan
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 px-1 font-medium">{msg.time}</span>
              </div>
            ))}

            {isChatting && (
              <div className="flex flex-col items-start">
                <div className="bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl rounded-bl-none p-3 text-xs flex items-center gap-2 border border-slate-200/70 dark:border-zinc-700/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 italic">
                    {AGENT_DESKS[activeAgent].title} sedang memproses data...
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-2.5 border-t border-gray-100 dark:border-zinc-800/80 flex flex-wrap gap-1.5 text-[11px] bg-slate-50/70 dark:bg-zinc-950/40">
            {deskDetails[activeAgent].prompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChat(undefined, p)}
                disabled={isChatting}
                className="text-left px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 border border-gray-200 dark:border-zinc-700 text-[10px] font-medium transition shadow-sm leading-snug"
              >
                💡 {p}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-gray-200 dark:border-zinc-800 flex gap-2 bg-white dark:bg-zinc-900">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatting}
              placeholder={isChatting ? `${AGENT_DESKS[activeAgent].shortTitle} sedang mengetik...` : `Tanyakan ke ${AGENT_DESKS[activeAgent].title}...`}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isChatting || !chatInput.trim()}
              className="p-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl transition disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Side: Live Report Deliverable Canvas (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 flex flex-col min-h-[580px] h-[640px] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {activeOutputTitle}
              </h2>
              {engineSource === "gemini_live" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-mono font-medium">
                  Live Gemini
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleCopyCanvas}
                disabled={!activeOutputContent}
                className="inline-flex items-center justify-center gap-1.5 w-[104px] min-w-[104px] px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition whitespace-nowrap flex-shrink-0 disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />}
                <span>{copied ? "Tersalin" : "Salin"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveToArchive(activeOutputContent, activeOutputTitle)}
                disabled={loadingAction || !activeOutputContent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition flex-shrink-0 whitespace-nowrap shadow-sm disabled:opacity-50"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>+ Simpan ke Pusat Laporan</span>
              </button>

              <button
                type="button"
                onClick={handlePrintCanvas}
                disabled={!activeOutputContent}
                className="p-1.5 rounded-lg border border-gray-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition"
                title="Cetak Ringkasan"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto text-xs text-slate-800 dark:text-zinc-200 bg-slate-50/50 dark:bg-zinc-950/40 select-text">
            {loadingAction ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-zinc-500 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-700" />
                <p className="text-xs">AI Agent sedang menyusun dokumen...</p>
              </div>
            ) : activeOutputContent ? (
              <MarkdownReportView content={activeOutputContent} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-500 text-xs">
                Pilih salah satu skill laporan di samping untuk menyusun deliverable.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. PUSAT REVIEW & ARSIP LAPORAN AI (Menggantikan Moderation Gate WhatsApp) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h2 className="font-semibold text-base text-gray-900 dark:text-white">
                Pusat Review & Arsip Laporan AI
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Pusat pengesahan internal manajemen tanpa pengiriman pesan ke pihak ketiga.
              </p>
            </div>
          </div>

          {/* Filter Tab: Menunggu Review vs Telah Diarsipkan */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setArchiveTab("pending")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                archiveTab === "pending"
                  ? "bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 shadow-sm"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Menunggu Review ({pendingReports.length})
            </button>
            <button
              type="button"
              onClick={() => setArchiveTab("archived")}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                archiveTab === "archived"
                  ? "bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Telah Diarsipkan ({archivedReports.length})
            </button>
          </div>
        </div>

        {displayedReports.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-zinc-500 text-xs">
            {archiveTab === "pending"
              ? "Tidak ada laporan yang menunggu review. Klik '+ Simpan ke Pusat Laporan' di chat atau kanvas untuk menambahkan."
              : "Belum ada laporan yang disahkan ke arsip."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedReports.map((item) => {
              const isEditing = editingItemId === item.id;
              const isArchived = item.status === "ARCHIVED";

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    isArchived
                      ? "bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                      : "bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 shadow-sm"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-gray-400">Akurasi AI: {item.aiConfidence}</span>
                    </div>

                    <p className="text-xs font-bold text-gray-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.agentTitle} • {item.summary}
                    </p>

                    {/* Mode Edit Inline */}
                    {isEditing ? (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/50 font-medium">
                          <span>✏️ Mode Edit Aktif</span>
                          <span className="text-[10px]">Simpan perubahan sebelum pengesahan</span>
                        </div>
                        <input
                          type="text"
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder="Judul laporan"
                          className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white font-semibold"
                        />
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono"
                          rows={5}
                        />
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="px-2.5 py-1 text-[11px] rounded-lg border border-gray-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={loadingAction || !editedText.trim()}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition disabled:opacity-50"
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/70 border border-gray-100 dark:border-zinc-700/60 font-mono text-[11px] text-gray-800 dark:text-gray-200 max-h-36 overflow-y-auto whitespace-pre-wrap">
                        {item.content}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                      {isArchived ? `Diarsipkan: ${item.archivedAt || "Selesai"}` : item.createdAt}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Tombol Salin Teks */}
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.content, item.title)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition"
                        title="Salin Teks Laporan"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {!isArchived && (
                        <>
                          {/* Tombol Edit */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditedText(item.content);
                              setEditedTitle(item.title);
                            }}
                            className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition"
                            title="Edit Laporan"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Hapus */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                            title="Hapus Draf"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Tombol Sahkan & Arsipkan (Wajib disabled saat mode edit aktif) */}
                          <button
                            type="button"
                            onClick={() => handleArchiveReport(item.id)}
                            disabled={loadingAction || isEditing}
                            title={isEditing ? "Simpan perubahan edit terlebih dahulu sebelum mengesahkan" : "Sahkan dan arsipkan laporan"}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>✓ Sahkan & Arsipkan</span>
                          </button>
                        </>
                      )}

                      {isArchived && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
