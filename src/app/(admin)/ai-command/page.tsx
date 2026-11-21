"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  Send,
  FileText,
  UserCheck2,
  Video,
  Share2,
  Copy,
  Check,
  TrendingUp,
  AlertTriangle,
  Building2,
  Users,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  Lock,
  Key,
  ArrowRight,
  Zap,
  Save
} from "lucide-react";

interface Stats {
  totalPelanggan: number;
  komplainPending: number;
  tagihanBelumBayar: number;
  totalMitra: number;
  transaksiLunasCount: number;
  kasBulanIniEstimasi: number;
  tunggakanEstimasi: number;
}

interface ApprovalItem {
  id: string;
  type: string;
  recipientName: string;
  recipientPhone: string;
  category: string;
  summary: string;
  draftText: string;
  aiConfidence: string;
  status: string;
  createdAt: string;
}

export default function AiCommandHubPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalItem[]>([]);
  const [hasServerGeminiKey, setHasServerGeminiKey] = useState(false);
  const [clientGeminiKey, setClientGeminiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [testingKey, setTestingKey] = useState(false);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [engineSource, setEngineSource] = useState<"gemini_live" | "fallback">("fallback");

  const [activeRole, setActiveRole] = useState<"copilot" | "sdr" | "content" | "support">("copilot");
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const roleMeta = {
    copilot: {
      id: "copilot",
      title: "Executive Co-Pilot",
      badge: "Analitik & Finansial",
      icon: TrendingUp,
      color: "emerald",
      skills: ["Audit Kas & Kolektibilitas", "Deteksi Tunggakan", "Rekomendasi Bisnis"],
      prompts: [
        "Analisis performa keuangan & operasional hari ini",
        "Berapa sisa kas yang belum tertagih bulan ini?",
        "Evaluasi efisiensi rute armada dan pengaduan",
      ],
      greeting: "Halo Owner! Saya Executive Co-Pilot Anda. Saya memiliki akses riil ke database metrik pelanggan, kas masuk, dan rute armada untuk membantu keputusan strategis Anda.",
    },
    sdr: {
      id: "sdr",
      title: "B2B SDR Agent",
      badge: "Akuisisi Mitra Desa",
      icon: Building2,
      color: "blue",
      skills: ["Pain Point BUMDes & KSM", "Proposal Kemitraan", "Objection Handling"],
      prompts: [
        "Buatkan surat penawaran kemitraan resmi untuk BUMDes",
        "Bagaimana membantah keberatan 'aplikasi digital terlalu mahal'?",
        "Tulis 3-step pesan WhatsApp outreach ke pengurus KSM",
      ],
      greeting: "Halo! Saya B2B SDR Agent UPSHERU. Tugas saya memprospek dan mengakuisisi BUMDes, KSM, dan TPS3R agar bermitra dengan platform digital WastePay.",
    },
    content: {
      id: "content",
      title: "Content Strategist",
      badge: "Viral & Edukasi Warga",
      icon: Video,
      color: "purple",
      skills: ["Video 50 Detik (TikTok/Reels)", "3 Pilihan Hook Viral", "Broadcast WA Grup RT"],
      prompts: [
        "Buat naskah video 50 detik alasan iuran sampah penting",
        "Tulis pesan broadcast santun untuk grup WA warga RT",
        "Buat 3 hook kontroversial tentang bahaya buang sampah liar",
      ],
      greeting: "Halo! Saya Viral Content Strategist UPSHERU. Saya merancang konten edukasi publik agar warga sadar pentingnya membayar retribusi tepat waktu via scan QRIS.",
    },
    support: {
      id: "support",
      title: "Support & Billing Ops",
      badge: "Akses DB Riil & QRIS",
      icon: Users,
      color: "amber",
      skills: ["Akses Data Nunggak Riil", "Draf Reminder QRIS", "Kirim ke Antrean Approval"],
      prompts: [
        "Tampilkan daftar warga belum bayar & buat draf pengingat",
        "Buatkan permohonan maaf armada sampah terlambat ke warga",
        "Buat konfirmasi pembayaran lunas dan ucapan terima kasih",
      ],
      greeting: "Halo! Saya Resident Support & Billing Ops. Saya terhubung langsung ke database tagihan pelanggan dan komplain armada untuk membantu penagihan santun dan mitigasi komplain.",
    },
  };

  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: "owner" | "ai"; text: string; time: string; role?: string }>
  >([
    {
      sender: "ai",
      text: "Halo Bapak/Ibu Owner. AI Agent Engine UPSHERU telah aktif dengan 4 Role Spesialis (Co-Pilot, B2B SDR, Content Strategist, & Support Ops). Pilih role di atas untuk berganti fokus tugas dan skill!",
      time: "Baru saja",
      role: "copilot",
    },
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  const [activeOutputTitle, setActiveOutputTitle] = useState("Laporan Eksekutif Harian");
  const [activeOutputContent, setActiveOutputContent] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");

  // Load API key from localStorage if exists & auto-sync to DB
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem("upsheru_gemini_key") || "";
      if (savedKey) {
        setClientGeminiKey(savedKey);
        setKeyInput(savedKey);
        // Otomatis sinkronkan ke database server agar permanen untuk semua sesi login
        fetch("/api/ai-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_gemini_key", payload: { key: savedKey, skipTest: true } }),
        }).catch(() => {});
      }
    }
    fetchData();
    handleTriggerAction("daily_report");
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
        if (data.approvalQueue) {
          setApprovalQueue(data.approvalQueue);
        }
      }
    } catch (e) {
      console.error("Gagal load data:", e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Simpan Langsung (Instan tanpa tes koneksi)
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

  // Simpan dan Uji Koneksi Live
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

  const handleTriggerAction = async (action: string, payload: any = {}) => {
    setLoadingAction(true);
    setNotification(null);
    try {
      if (action === "daily_report") setActiveOutputTitle("📊 Laporan Eksekutif Harian");
      if (action === "sdr_pitch") setActiveOutputTitle("💼 Draf Penawaran Kemitraan (SDR)");
      if (action === "content_script") setActiveOutputTitle("🎬 Naskah Konten Edukasi Warga");

      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action, payload: { ...payload, geminiApiKey: clientGeminiKey } }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setActiveOutputContent(data.result);
        if (data.engine) setEngineSource(data.engine);
      }
    } catch (e) {
      console.error("Error trigger action:", e);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleApproveItem = async (id: string) => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "approve_item", payload: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message);
        if (data.updatedQueue) setApprovalQueue([...data.updatedQueue]);
      } else {
        setNotification("Gagal menyetujui: " + data.error);
      }
    } catch (err: any) {
      setNotification("Error: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectItem = async (id: string) => {
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "reject_item", payload: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message);
        if (data.updatedQueue) setApprovalQueue([...data.updatedQueue]);
      }
    } catch (err: any) {
      setNotification("Error: " + err.message);
    }
  };

  const handleSaveEdit = async (id: string) => {
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "update_draft", payload: { id, newText: editedText } }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message);
        if (data.updatedQueue) setApprovalQueue([...data.updatedQueue]);
        setEditingItemId(null);
      }
    } catch (err: any) {
      setNotification("Error: " + err.message);
    }
  };

  const handleSwitchRole = (newRole: "copilot" | "sdr" | "content" | "support") => {
    if (newRole === activeRole) return;
    setActiveRole(newRole);
    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: roleMeta[newRole].greeting,
        time: timeNow,
        role: newRole,
      },
    ]);
  };

  const handleAddToApprovalQueue = async (text: string, title?: string) => {
    setLoadingAction(true);
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "create_approval_item",
          payload: {
            category:
              activeRole === "sdr"
                ? "Penawaran Kemitraan SDR"
                : activeRole === "content"
                ? "Konten Edukasi Warga"
                : "Pesan Warga & Tagihan",
            summary: title || `Draf dari ${roleMeta[activeRole].title}`,
            draftText: text,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification(data.message || "✅ Draf berhasil dimasukkan ke Antrean Persetujuan!");
        if (data.updatedQueue) setApprovalQueue([...data.updatedQueue]);
      } else {
        setNotification("❌ Gagal: " + data.error);
      }
    } catch (e: any) {
      setNotification("Error: " + e.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        sender: "ai",
        text: `Halo Boss! Sesi baru telah di-reset untuk **${roleMeta[activeRole].title}**. Seluruh konteks percakapan sebelumnya telah dibersihkan. Silakan mulai instruksi baru.`,
        role: activeRole,
      },
    ]);
  };

  const handleSendChat = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = (customMsg || chatInput).trim();
    if (!userMsg || isChatting) return;

    const timeNow = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

    // Multi-turn conversation history (ambil hingga 12 pesan sebelumnya untuk mempertahankan konteks)
    const historyPayload = chatMessages.slice(-12).map((m) => ({
      role: m.sender === "owner" ? ("user" as const) : ("model" as const),
      text: m.text,
    }));

    setChatMessages((prev) => [...prev, { sender: "owner", text: userMsg, time: timeNow }]);
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
            role: activeRole,
            history: historyPayload,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setChatMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.result, time: timeNow, role: activeRole },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.error
              ? `⚠️ Sistem: ${data.error}`
              : "Instruksi diterima, namun terjadi kendala respon dari server.",
            time: timeNow,
            role: activeRole,
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ Kendala jaringan: ${err.message || "Gagal menghubungi server"}`,
          time: timeNow,
          role: activeRole,
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleCopy = () => {
    if (!activeOutputContent) return;
    navigator.clipboard.writeText(activeOutputContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToWhatsApp = async () => {
    if (!activeOutputContent) return;
    setLoadingAction(true);
    setNotification(null);
    try {
      const res = await fetch("/api/ai-command", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "send_whatsapp",
          payload: { message: activeOutputContent },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification("Laporan berhasil dikirim ke WhatsApp Owner!");
      } else {
        setNotification("Gagal mengirim ke WhatsApp: " + (data.error || "Cek kredensial"));
      }
    } catch (err: any) {
      setNotification("Error request: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const isGeminiConnected = hasServerGeminiKey || Boolean(clientGeminiKey && clientGeminiKey.length > 5);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Bot className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              AI Agent Command Hub & Approval Gate
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Human-in-the-Loop Active
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pusat kendali komunikasi Owner dengan AI Agent. Terhubung langsung ke Google Gemini API dengan antrean moderasi sebelum pesan dikirim.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isGeminiConnected ? (
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              Gemini Terhubung Permanen
            </button>
          ) : (
            <button
              onClick={() => setShowKeyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition animate-pulse"
            >
              <Key className="w-3.5 h-3.5 text-amber-600" />
              Hubungkan Gemini API Key
            </button>
          )}

          <button
            onClick={fetchData}
            disabled={loadingStats}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? "animate-spin" : ""}`} />
            Refresh Data
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
                className="text-emerald-600 underline font-semibold"
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
                className="px-4 py-1.5 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition"
              >
                {testingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                {testingKey ? "Menguji..." : "Simpan & Uji Live"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guardrails Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span><strong>Batasan AI:</strong> Wajib persetujuan Admin untuk penawaran mitra & komplain warga.</span>
        </div>
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
          <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span><strong>Isolasi Database:</strong> Data pelanggan antar mitra terisolasi aman (Multi-Tenant).</span>
        </div>
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
          <Bot className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span><strong>Auto-Reply Whitelist:</strong> Otomatis balas hanya untuk cek tagihan & FAQ resmi.</span>
        </div>
      </div>

      {/* Metrik Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Pelanggan Aktif</p>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {loadingStats ? "..." : stats?.totalPelanggan.toLocaleString("id-ID") + " KK"}
          </p>
          <p className="text-xs text-gray-500 mt-1">Kolektibilitas QRIS: 88%</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sisa Tunggakan</p>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {loadingStats ? "..." : (stats?.tagihanBelumBayar || 0) + " KK"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ~Rp {stats ? stats.tunggakanEstimasi.toLocaleString("id-ID") : "..."}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pengaduan Pending</p>
            <ShieldAlert className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            {loadingStats ? "..." : stats?.komplainPending + " Laporan"}
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Semua rute terjadwal</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Antrean Review AI</p>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {approvalQueue.filter((q) => q.status === "PENDING_APPROVAL").length} Draf
          </p>
          <p className="text-xs text-purple-600 mt-1">Menunggu persetujuan Anda</p>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* SECTION: ANTREAN PERSETUJUAN (APPROVAL QUEUE) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-base text-gray-900 dark:text-white">
              Antrean Persetujuan Admin (Moderation Gate)
            </h2>
            <span className="text-xs text-gray-400">({approvalQueue.filter(q => q.status === "PENDING_APPROVAL").length} menunggu kirim)</span>
          </div>
          <span className="text-xs text-gray-500">Pesan tidak akan sampai ke WhatsApp konsumen sebelum disetujui</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {approvalQueue.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                item.status === "APPROVED_AND_SENT"
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 opacity-80"
                  : item.status === "REJECTED"
                  ? "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 opacity-60"
                  : "bg-white dark:bg-gray-850 border-gray-200 dark:border-gray-700 shadow-sm"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-gray-400">Akurasi AI: {item.aiConfidence}</span>
                </div>

                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  Tujuan: {item.recipientName} ({item.recipientPhone})
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.summary}</p>

                {editingItemId === item.id ? (
                  <div className="mt-2.5 space-y-2">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={4}
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="px-2 py-1 text-[11px] rounded border border-gray-300 text-gray-600"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-2 py-1 text-[11px] rounded bg-emerald-600 text-white"
                      >
                        Simpan Draf
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/60 font-mono text-[11px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    "{item.draftText}"
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{item.createdAt}</span>

                {item.status === "PENDING_APPROVAL" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingItemId(item.id);
                        setEditedText(item.draftText);
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                      title="Edit Draf"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRejectItem(item.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                      title="Tolak Draf"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleApproveItem(item.id)}
                      disabled={loadingAction}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Setujui & Kirim
                    </button>
                  </div>
                )}

                {item.status === "APPROVED_AND_SENT" && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terkirim ke WhatsApp
                  </span>
                )}

                {item.status === "REJECTED" && (
                  <span className="text-[11px] font-medium text-gray-400">Ditolak Admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Dual Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Interactive Chat Console with Specialized AI Agents (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col h-[600px] shadow-sm">
          {/* Header Console & Active Model */}
          <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-sm text-gray-900 dark:text-white">
                Live AI Specialist Hub
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-mono">
                {isGeminiConnected ? "Gemini Live" : "Fallback Engine"}
              </span>
              <span className={`inline-block w-2 h-2 rounded-full ${isGeminiConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
              <button
                type="button"
                onClick={handleResetChat}
                title="Reset Sesi Percakapan & Bersihkan Memori"
                className="ml-1 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-850 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Role Switcher Tabs */}
          <div className="p-2.5 bg-gray-50/80 dark:bg-gray-850 border-b border-gray-200 dark:border-gray-800 space-y-2">
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(roleMeta) as Array<keyof typeof roleMeta>).map((rKey) => {
                const r = roleMeta[rKey];
                const IconComponent = r.icon;
                const isActive = activeRole === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => handleSwitchRole(rKey)}
                    className={`py-1.5 px-1 rounded-xl text-center flex flex-col items-center gap-0.5 transition ${
                      isActive
                        ? "bg-white dark:bg-gray-800 shadow-sm border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                        : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`} />
                    <span className="text-[10px] leading-tight truncate w-full">{r.title.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Skills & Database Access Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-0.5">
              <span className="text-gray-400 font-medium whitespace-nowrap">Skill Aktif:</span>
              {roleMeta[activeRole].skills.map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap font-medium"
                >
                  ✓ {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.sender === "owner" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl p-3 leading-relaxed ${
                    msg.sender === "owner"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none border border-gray-200/50 dark:border-gray-700/50"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Tombol aksi langsung ke antrean approval jika respon memuat draf pesan */}
                  {msg.sender === "ai" && msg.text.length > 50 && (
                    <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddToApprovalQueue(msg.text)}
                        disabled={loadingAction}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition shadow-xs"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        + Masukkan ke Antrean Approval
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}

            {isChatting && (
              <div className="flex flex-col items-start">
                <div className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl rounded-bl-none p-3 text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-gray-500 italic">
                    {roleMeta[activeRole].title} sedang memproses data...
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Bar Berdasarkan Role Aktif */}
          <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800/80 flex gap-1.5 overflow-x-auto text-[11px] bg-gray-50/50 dark:bg-gray-850/50">
            {roleMeta[activeRole].prompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChat(undefined, p)}
                disabled={isChatting}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-200 dark:border-gray-700 text-[10px] font-medium transition shadow-xs"
              >
                💡 {p}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendChat} className="p-3 border-t border-gray-200 dark:border-gray-800 flex gap-2 bg-white dark:bg-gray-900">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatting}
              placeholder={isChatting ? `${roleMeta[activeRole].title} sedang mengetik...` : `Tanyakan ke ${roleMeta[activeRole].title}...`}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isChatting || !chatInput.trim()}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Side: Live Report Deliverable Canvas (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col h-[600px] shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <h2 className="font-semibold text-sm text-gray-900 dark:text-white">
                {activeOutputTitle}
              </h2>
              {engineSource === "gemini_live" && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                  Live Gemini
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                disabled={!activeOutputContent}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Tersalin" : "Salin"}
              </button>
              <button
                onClick={handleSendToWhatsApp}
                disabled={loadingAction || !activeOutputContent}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                Kirim ke WA Saya
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-gray-800 dark:text-gray-200 bg-gray-50/50 dark:bg-gray-950/40 whitespace-pre-wrap leading-relaxed select-text">
            {loadingAction ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <p>AI Agent sedang menyusun dokumen...</p>
              </div>
            ) : activeOutputContent ? (
              activeOutputContent
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Pilih salah satu tombol trigger di atas untuk menghasilkan output.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
