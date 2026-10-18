"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toast";

type Wilayah = {
  id: number;
  nama: string;
  rt?: string | null;
  rw?: string | null;
  kelurahan?: string | null;
  kecamatan?: string | null;
  kota?: string | null;
  kelurahanId?: number | null;
  zonaId?: number | null;
  kelurahanRef?: { id: number; nama: string; kecamatan?: string | null; kota?: string | null } | null;
  zona?: { id: number; nama: string; warna?: string | null } | null;
  _count?: { pelanggan?: number; rute?: number };
};

type Kelurahan = {
  id: number;
  nama: string;
  kode?: string | null;
  kecamatan?: string | null;
  kota?: string | null;
};

type Zona = {
  id: number;
  nama: string;
  kelurahanId: number;
  warna?: string | null;
};

type DuitkuStatus = {
  enabled: boolean;
  merchantCodeSet: boolean;
  apiKeySet: boolean;
  production: boolean;
  baseUrl: string;
  webhookUrl: string;
};

type GoogleContactsStatus = {
  configured: boolean;
  authorized: boolean;
  targetEmail?: string | null;
  lastSyncAt?: string | null;
  authUrl?: string | null;
  redirectUri?: string | null;
  totalPelanggan?: number;
};

const KECAMATAN_DEPOK = [
  "Cilodong",
  "Pancoran Mas",
  "Sukmajaya",
  "Beji",
  "Cimanggis",
  "Tapos",
  "Sawangan",
  "Bojongsari",
  "Cipayung",
  "Limo",
  "Cinere",
];

export default function PengaturanPage() {
  const [wilayahList, setWilayahList] = useState<Wilayah[]>([]);
  const [kelurahanList, setKelurahanList] = useState<Kelurahan[]>([]);
  const [zonaList, setZonaList] = useState<Zona[]>([]);
  const [duitkuStatus, setDuitkuStatus] = useState<DuitkuStatus | null>(null);
  const [googleStatus, setGoogleStatus] = useState<GoogleContactsStatus | null>(null);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [tarifSettings, setTarifSettings] = useState<{
    PAJAK_DAERAH_RATE: number;
    DENDA_KETERLAMBATAN_RATE: number;
    BATAS_BULAN_STOP_ANGKUT?: number;
    BIAYA_ADMIN?: number;
    WA_TEMPLATE_TAGIHAN?: string;
  }>({
    PAJAK_DAERAH_RATE: 0,
    DENDA_KETERLAMBATAN_RATE: 0,
    WA_TEMPLATE_TAGIHAN:
      'Halo Bpk/Ibu *{nama}* ({kode_pelanggan}),\n\nBerikut rincian tagihan retribusi sampah CV Tiga Putra Semesta (UPS HERU) untuk periode *{bulan}*:\n\n• Tarif Pokok: *{nominal_pokok}*\n• Pajak Daerah ({pajak_persen}%): *{pajak_daerah}*\n• Denda Keterlambatan: *{denda}*\n----------------------------------\n*Total Tagihan: {total_tagihan}*\n\nJatuh tempo: *{jatuh_tempo}*\nLink pembayaran & rincian: {link_pembayaran}\n\nTerima kasih atas partisipasi Anda dalam menjaga kebersihan lingkungan.',
  });
  const [tarifSaving, setTarifSaving] = useState(false);
  const { showToast } = useToast();

  // Search & Filter Wilayah
  const [searchWilayah, setSearchWilayah] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterKelurahan, setFilterKelurahan] = useState("");

  // Modal Tambah / Edit Wilayah
  const [showWilayahModal, setShowWilayahModal] = useState(false);
  const [editingWilayah, setEditingWilayah] = useState<Wilayah | null>(null);
  const [formKecamatan, setFormKecamatan] = useState("");
  const [formKelurahanId, setFormKelurahanId] = useState("");
  const [formNamaBlok, setFormNamaBlok] = useState("");
  const [formZonaId, setFormZonaId] = useState("");
  const [formRt, setFormRt] = useState("");
  const [formRw, setFormRw] = useState("");
  const [showAdvancedRtRw, setShowAdvancedRtRw] = useState(false);
  const [savingWilayah, setSavingWilayah] = useState(false);
  const [formWilayahError, setFormWilayahError] = useState("");

  // Deduplikasi & Hapus Wilayah
  const [deleteTarget, setDeleteTarget] = useState<Wilayah | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDedupConfirm, setShowDedupConfirm] = useState(false);
  const [dedupLoading, setDedupLoading] = useState(false);

  // Ganti password
  const [pwForm, setPwForm] = useState({ passwordLama: "", passwordBaru: "", konfirmasi: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwError, setPwError] = useState("");

  async function handleGantiPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage("");
    setPwError("");
    if (pwForm.passwordBaru !== pwForm.konfirmasi) {
      setPwError("Konfirmasi password tidak cocok");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/ganti-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passwordLama: pwForm.passwordLama,
          passwordBaru: pwForm.passwordBaru,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMessage(data.message || "Password berhasil diganti");
        setPwForm({ passwordLama: "", passwordBaru: "", konfirmasi: "" });
      } else {
        setPwError(data.error || "Gagal mengganti password");
      }
    } catch {
      setPwError("Terjadi kesalahan, coba lagi");
    } finally {
      setPwLoading(false);
    }
  }

  const fetchWilayah = useCallback(async () => {
    try {
      const res = await fetch("/api/wilayah");
      if (res.ok) {
        const data = await res.json();
        setWilayahList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Gagal memuat wilayah:", err);
    }
  }, []);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrasi/google-contacts");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setGoogleStatus(data.data);
      }
    } catch {
      /* abaikan */
    }
  }, []);

  async function handleGoogleSync() {
    setGoogleSyncing(true);
    try {
      const res = await fetch("/api/integrasi/google-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateExisting: false }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast(
          `✓ Sinkronisasi selesai: ${result.data.created} baru dibuat, ${result.data.skipped} dilewati, ${result.data.updated} diperbarui.`,
          "success"
        );
        fetchGoogleStatus();
      } else {
        showToast(result.error || "Gagal sinkronisasi kontak ke Google", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Terjadi kesalahan saat sinkronisasi", "error");
    } finally {
      setGoogleSyncing(false);
    }
  }

  async function handleGoogleDisconnect() {
    if (!confirm("Apakah Anda yakin ingin memutuskan akun Google ini?")) return;
    setGoogleDisconnecting(true);
    try {
      const res = await fetch("/api/integrasi/google-contacts", { method: "DELETE" });
      if (res.ok) {
        showToast("Koneksi akun Google berhasil diputuskan.", "info");
        fetchGoogleStatus();
      }
    } catch {
      showToast("Gagal memutuskan koneksi", "error");
    } finally {
      setGoogleDisconnecting(false);
    }
  }

  useEffect(() => {
    (async () => { await fetchWilayah(); })();
    fetchGoogleStatus();

    // Feedback dari redirect OAuth Google
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const googleStatusParam = sp.get("google_status");
      if (googleStatusParam === "success") {
        const email = sp.get("email") || "Google";
        showToast(`✓ Akun Google (${email}) berhasil dihubungkan!`, "success");
        window.history.replaceState({}, "", "/pengaturan");
      } else if (googleStatusParam === "error") {
        showToast(`Gagal menghubungkan Google: ${sp.get("error_msg") || "Terjadi kesalahan"}`, "error");
        window.history.replaceState({}, "", "/pengaturan");
      }
    }
    (async () => {
      try {
        const [zonaRes, kelurahanRes] = await Promise.all([
          fetch("/api/zona"),
          fetch("/api/kelurahan"),
        ]);
        if (zonaRes.ok) setZonaList(await zonaRes.json());
        if (kelurahanRes.ok) setKelurahanList(await kelurahanRes.json());
      } catch (err) {
        console.error("Gagal memuat zona & kelurahan:", err);
      }
    })();

    // Status konfigurasi Duitku
    (async () => {
      try {
        const res = await fetch("/api/duitku/status");
        if (res.ok) setDuitkuStatus(await res.json());
      } catch { /* abaikan */ }
    })();

    // Pengaturan Tarif & Pajak
    (async () => {
      try {
        const res = await fetch("/api/pengaturan");
        if (res.ok) setTarifSettings(await res.json());
      } catch { /* abaikan */ }
    })();
  }, [fetchWilayah]);

  // List Kecamatan unik (Depok master + database kelurahan)
  const availableKecamatanList = useMemo(() => {
    const fromKel = kelurahanList.map((k) => k.kecamatan).filter(Boolean) as string[];
    const combined = Array.from(new Set([...KECAMATAN_DEPOK, ...fromKel]));
    return combined.sort();
  }, [kelurahanList]);

  // Kelurahan filtered by form's selected Kecamatan
  const formKelurahanOptions = useMemo(() => {
    if (!formKecamatan) return kelurahanList;
    return kelurahanList.filter(
      (k) => k.kecamatan?.toLowerCase() === formKecamatan.toLowerCase()
    );
  }, [kelurahanList, formKecamatan]);

  // Kelurahan filtered by filter header's selected Kecamatan
  const filterKelurahanOptions = useMemo(() => {
    if (!filterKecamatan) return kelurahanList;
    return kelurahanList.filter(
      (k) => k.kecamatan?.toLowerCase() === filterKecamatan.toLowerCase()
    );
  }, [kelurahanList, filterKecamatan]);

  // Filtered Wilayah list
  const filteredWilayahList = useMemo(() => {
    return wilayahList.filter((w) => {
      const wKec = w.kelurahanRef?.kecamatan || w.kecamatan || "";
      const wKelId = (w.kelurahanId ?? w.kelurahanRef?.id)?.toString() || "";
      const wNama = (w.nama || "").toLowerCase();

      if (filterKecamatan && wKec.toLowerCase() !== filterKecamatan.toLowerCase()) {
        return false;
      }
      if (filterKelurahan && wKelId !== filterKelurahan) {
        return false;
      }
      if (searchWilayah) {
        const q = searchWilayah.toLowerCase().trim();
        const matchNama = wNama.includes(q);
        const matchKel = (w.kelurahanRef?.nama || w.kelurahan || "").toLowerCase().includes(q);
        const matchKec = wKec.toLowerCase().includes(q);
        if (!matchNama && !matchKel && !matchKec) return false;
      }
      return true;
    });
  }, [wilayahList, filterKecamatan, filterKelurahan, searchWilayah]);

  // Analisa Duplikasi Wilayah
  const duplicateStats = useMemo(() => {
    const groups = new Map<string, Wilayah[]>();
    for (const w of wilayahList) {
      const kelKey = (w.kelurahanRef?.nama || w.kelurahan || "").trim().toLowerCase();
      const blokKey = (w.nama || "").trim().replace(/\s+/g, " ").toLowerCase();
      const key = `${kelKey}:::${blokKey}`;
      const list = groups.get(key) || [];
      list.push(w);
      groups.set(key, list);
    }

    let count = 0;
    const duplicateIds = new Set<number>();
    const sampleNames: string[] = [];

    for (const [, members] of groups.entries()) {
      if (members.length > 1) {
        count += members.length - 1;
        if (sampleNames.length < 3) {
          sampleNames.push(members[0].nama);
        }
        for (const m of members) {
          duplicateIds.add(m.id);
        }
      }
    }

    return {
      hasDuplicates: count > 0,
      count,
      duplicateIds,
      sampleNames: sampleNames.join(", "),
    };
  }, [wilayahList]);

  // Total pelanggan across displayed wilayah
  const totalPelangganCount = useMemo(() => {
    return filteredWilayahList.reduce((acc, w) => acc + (w._count?.pelanggan ?? 0), 0);
  }, [filteredWilayahList]);

  function resetWilayahForm() {
    setFormKecamatan("");
    setFormKelurahanId("");
    setFormNamaBlok("");
    setFormZonaId("");
    setFormRt("");
    setFormRw("");
    setShowAdvancedRtRw(false);
    setFormWilayahError("");
    setEditingWilayah(null);
  }

  function openCreateWilayah() {
    resetWilayahForm();
    if (filterKecamatan) {
      setFormKecamatan(filterKecamatan);
    }
    if (filterKelurahan) {
      setFormKelurahanId(filterKelurahan);
    }
    setShowWilayahModal(true);
  }

  function openEditWilayah(w: Wilayah) {
    resetWilayahForm();
    setEditingWilayah(w);
    setFormNamaBlok(w.nama);
    setFormKecamatan(w.kelurahanRef?.kecamatan || w.kecamatan || "");
    setFormKelurahanId(w.kelurahanId ? w.kelurahanId.toString() : (w.kelurahanRef?.id ? w.kelurahanRef.id.toString() : ""));
    setFormZonaId(w.zonaId ? w.zonaId.toString() : "");
    setFormRt(w.rt || "");
    setFormRw(w.rw || "");
    if (w.rt || w.rw) {
      setShowAdvancedRtRw(true);
    }
    setShowWilayahModal(true);
  }

  async function handleSubmitWilayah(e: React.FormEvent) {
    e.preventDefault();
    if (!formNamaBlok.trim()) {
      setFormWilayahError("Nama blok pickup wajib diisi");
      return;
    }
    if (!formKelurahanId) {
      setFormWilayahError("Kelurahan wajib dipilih");
      return;
    }

    setSavingWilayah(true);
    setFormWilayahError("");

    try {
      const payload = {
        nama: formNamaBlok.trim(),
        kelurahanId: formKelurahanId,
        zonaId: formZonaId || null,
        rt: formRt.trim() || null,
        rw: formRw.trim() || null,
      };

      const isEdit = !!editingWilayah;
      const url = isEdit ? `/api/wilayah/${editingWilayah.id}` : "/api/wilayah";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setShowWilayahModal(false);
        resetWilayahForm();
        await fetchWilayah();
        showToast(isEdit ? "Blok pickup berhasil diperbarui" : "Blok pickup berhasil ditambahkan");
      } else {
        setFormWilayahError(data.error || "Gagal menyimpan blok pickup");
        showToast(data.error || "Gagal menyimpan blok pickup", "error");
      }
    } catch {
      setFormWilayahError("Terjadi kesalahan koneksi jaringan");
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setSavingWilayah(false);
    }
  }

  async function handleRunDedup() {
    setDedupLoading(true);
    try {
      const res = await fetch("/api/wilayah/dedup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Data duplikat berhasil digabung dan dibersihkan");
        setShowDedupConfirm(false);
        await fetchWilayah();
      } else {
        showToast(data.error || "Gagal membersihkan duplikat", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDedupLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/wilayah/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Blok pickup berhasil dihapus");
        setDeleteTarget(null);
        await fetchWilayah();
      } else {
        showToast(data.error || "Gagal menghapus wilayah", "error");
      }
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveTarif(e: React.FormEvent) {
    e.preventDefault();
    setTarifSaving(true);
    try {
      const res = await fetch("/api/pengaturan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tarifSettings),
      });
      if (res.ok) showToast("Pengaturan tarif, pajak, & template WA berhasil disimpan");
      else showToast("Gagal menyimpan pengaturan tarif", "error");
    } catch {
      showToast("Terjadi kesalahan jaringan", "error");
    } finally {
      setTarifSaving(false);
    }
  }

  const waVariableChips = [
    { label: "{nama}", desc: "Nama Pelanggan" },
    { label: "{kode_pelanggan}", desc: "Kode Warga (WP-xxxx)" },
    { label: "{bulan}", desc: "Bulan Periode" },
    { label: "{nominal_pokok}", desc: "Tarif Pokok (Rp)" },
    { label: "{pajak_persen}", desc: "Persen Pajak (%)" },
    { label: "{pajak_daerah}", desc: "Pajak Daerah (Rp)" },
    { label: "{denda}", desc: "Denda Keterlambatan (Rp)" },
    { label: "{total_tagihan}", desc: "Total Tagihan Akhir (Rp)" },
    { label: "{jatuh_tempo}", desc: "Jatuh Tempo" },
    { label: "{link_pembayaran}", desc: "URL Cek/Bayar Online" },
  ];

  function insertWaChip(tag: string) {
    const current = tarifSettings.WA_TEMPLATE_TAGIHAN || "";
    setTarifSettings((prev) => ({
      ...prev,
      WA_TEMPLATE_TAGIHAN: current ? `${current} ${tag}` : tag,
    }));
  }

  const simulatedWaMessage = useMemo(() => {
    const rawTemplate =
      tarifSettings.WA_TEMPLATE_TAGIHAN ||
      'Halo Bpk/Ibu *{nama}* ({kode_pelanggan}),\n\nBerikut rincian tagihan retribusi sampah CV Tiga Putra Semesta (UPS HERU) untuk periode *{bulan}*:\n\n• Tarif Pokok: *{nominal_pokok}*\n• Pajak Daerah ({pajak_persen}%): *{pajak_daerah}*\n• Denda Keterlambatan: *{denda}*\n----------------------------------\n*Total Tagihan: {total_tagihan}*\n\nJatuh tempo: *{jatuh_tempo}*\nLink pembayaran & rincian: {link_pembayaran}\n\nTerima kasih atas partisipasi Anda dalam menjaga kebersihan lingkungan.';

    const pokok = 50000;
    const pajakPct = tarifSettings.PAJAK_DAERAH_RATE || 0;
    const pajakRp = Math.round(pokok * (pajakPct / 100));
    const dendaPct = tarifSettings.DENDA_KETERLAMBATAN_RATE || 0;
    const dendaRp = Math.round(pokok * (dendaPct / 100));
    const total = pokok + pajakRp + dendaRp;

    return rawTemplate
      .replace(/\{nama\}/g, "Bpk. Rahmat Santoso")
      .replace(/\{kode_pelanggan\}/g, "WP-0821")
      .replace(/\{bulan\}/g, "Oktober 2026")
      .replace(/\{nominal_pokok\}/g, `Rp ${pokok.toLocaleString("id-ID")}`)
      .replace(/\{pajak_persen\}/g, String(pajakPct))
      .replace(/\{pajak_daerah\}/g, `Rp ${pajakRp.toLocaleString("id-ID")}`)
      .replace(/\{denda\}/g, `Rp ${dendaRp.toLocaleString("id-ID")}`)
      .replace(/\{total_tagihan\}/g, `Rp ${total.toLocaleString("id-ID")}`)
      .replace(/\{jatuh_tempo\}/g, "20 Oktober 2026")
      .replace(/\{link_pembayaran\}/g, "https://wastepay.vercel.app/bayar?ref=WP-0821");
  }, [tarifSettings]);

  function renderWhatsAppFormattedText(text: string) {
    const lines = text.split("\n");
    return lines.map((line, li) => {
      const parts = line.split(/(\*[^*]+\*)/g);
      return (
        <span key={li} className="block min-h-[1.25rem]">
          {parts.map((part, pi) => {
            if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
              return (
                <strong key={pi} className="font-bold text-slate-900">
                  {part.slice(1, -1)}
                </strong>
              );
            }
            if (part.includes("http://") || part.includes("https://")) {
              const urlParts = part.split(/(https?:\/\/[^\s]+)/g);
              return urlParts.map((u, ui) => {
                if (u.startsWith("http://") || u.startsWith("https://")) {
                  return (
                    <span key={ui} className="text-emerald-700 underline underline-offset-2 break-all">
                      {u}
                    </span>
                  );
                }
                return <span key={ui}>{u}</span>;
              });
            }
            return <span key={pi}>{part}</span>;
          })}
        </span>
      );
    });
  }

  return (
    <div className="p-4 sm:p-6 w-full space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Pengaturan</h1>
        <p className="text-sm text-slate-500 font-medium">Kelola konfigurasi sistem, wilayah operasional, dan parameter tarif</p>
      </div>

      {/* MANAJEMEN WILAYAH: KECAMATAN -> KELURAHAN -> BLOK PICKUP */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Blok Pickup & Wilayah Layanan</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Struktur operasional logistik: <span className="font-semibold text-slate-700">Kecamatan → Kelurahan → Nama Blok Pickup</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {duplicateStats.hasDuplicates && (
              <button
                onClick={() => setShowDedupConfirm(true)}
                disabled={dedupLoading}
                className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Bersihkan Duplikat ({duplicateStats.count})</span>
              </button>
            )}
            <button
              onClick={openCreateWilayah}
              className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Tambah Blok Pickup</span>
            </button>
          </div>
        </div>

        {/* BANNER NOTIFIKASI DUPLIKAT JIKA DITEMUKAN */}
        {duplicateStats.hasDuplicates && (
          <div className="mt-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Terdeteksi {duplicateStats.count} data blok duplikat ({duplicateStats.sampleNames})
                </h3>
                <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                  Terdapat beberapa record dengan nama dan kelurahan yang sama. Seluruh riwayat pelanggan & rute dapat digabungkan secara otomatis ke satu record utama tanpa kehilangan data.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDedupConfirm(true)}
              disabled={dedupLoading}
              className="shrink-0 bg-amber-700 hover:bg-amber-800 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all self-end md:self-center"
            >
              {dedupLoading ? "Memproses..." : "🧹 Gabung & Bersihkan Sekarang"}
            </button>
          </div>
        )}

        {/* FILTER & PENCARIAN BLOK PICKUP */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="sm:col-span-4 relative">
            <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari blok pickup (misal: Bakung)..."
              value={searchWilayah}
              onChange={(e) => setSearchWilayah(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Filter Kecamatan */}
          <div className="sm:col-span-3">
            <select
              value={filterKecamatan}
              onChange={(e) => {
                setFilterKecamatan(e.target.value);
                setFilterKelurahan(""); // reset kelurahan filter on kecamatan change
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 font-medium"
            >
              <option value="">Semua Kecamatan</option>
              {availableKecamatanList.map((kec) => (
                <option key={kec} value={kec}>
                  Kec. {kec}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelurahan */}
          <div className="sm:col-span-3">
            <select
              value={filterKelurahan}
              onChange={(e) => setFilterKelurahan(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 font-medium"
            >
              <option value="">Semua Kelurahan</option>
              {filterKelurahanOptions.map((k) => (
                <option key={k.id} value={k.id.toString()}>
                  Kel. {k.nama} {k.kecamatan ? `(${k.kecamatan})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Count Badges */}
          <div className="sm:col-span-2 flex items-center justify-end gap-2 text-xs font-medium text-slate-500">
            <span className="bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/60 font-semibold text-slate-700">
              {filteredWilayahList.length} Blok
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 font-semibold">
              {totalPelangganCount} Warga
            </span>
          </div>
        </div>

        {/* LIST KARTU BLOK PICKUP */}
        <div className="mt-5">
          {filteredWilayahList.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto mb-3 text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-800 mb-1">
                {wilayahList.length === 0 ? "Belum ada blok pickup terdaftar" : "Tidak ada blok pickup yang cocok"}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                {wilayahList.length === 0
                  ? "Tambahkan nama blok penjemputan sampah per kelurahan untuk mulai mengorganisir rute armada."
                  : "Coba ubah kata kunci pencarian atau reset filter kecamatan/kelurahan."}
              </p>
              {wilayahList.length === 0 && (
                <button
                  onClick={openCreateWilayah}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5"
                >
                  <span>+ Tambah Blok Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredWilayahList.map((w) => {
                const isDupe = duplicateStats.duplicateIds.has(w.id);
                const kelurahanName = w.kelurahanRef?.nama || w.kelurahan || "—";
                const kecamatanName = w.kelurahanRef?.kecamatan || w.kecamatan;
                const pelangganCount = w._count?.pelanggan ?? 0;

                return (
                  <div
                    key={w.id}
                    className={`relative bg-white rounded-2xl p-4 border transition-all hover:shadow-sm ${
                      isDupe
                        ? "border-amber-300/80 bg-amber-50/20"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    {/* Header: Nama Blok + Actions */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm tracking-tight truncate uppercase">
                            {w.nama}
                          </h3>
                          {isDupe && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Duplikat
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                          <span className="text-emerald-700 font-semibold">{kelurahanName}</span>
                          {kecamatanName && <span>· Kec. {kecamatanName}</span>}
                        </p>
                      </div>

                      {/* Tombol Edit & Hapus */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditWilayah(w)}
                          className="text-slate-400 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Blok Pickup"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(w)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Blok Pickup"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Footer info: Pelanggan count, Zona, RT/RW */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            pelangganCount > 0
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          👥 {pelangganCount} Pelanggan
                        </span>

                        {w.zona && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                            style={{
                              backgroundColor: w.zona.warna ? `${w.zona.warna}15` : "#f1f5f9",
                              borderColor: w.zona.warna ? `${w.zona.warna}40` : "#e2e8f0",
                              color: w.zona.warna || "#334155",
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: w.zona.warna || "#64748b" }}
                            />
                            {w.zona.nama}
                          </span>
                        )}
                      </div>

                      {(w.rt || w.rw) && (
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {[w.rt && `RT ${w.rt}`, w.rw && `RW ${w.rw}`].filter(Boolean).join(" / ")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pembayaran Online (Duitku) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">💳 Pembayaran Online (Duitku)</h2>
          {duitkuStatus && (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              duitkuStatus.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 border border-slate-200 text-slate-600"
            }`}>
              {duitkuStatus.enabled ? "✓ Aktif" : "Belum dikonfigurasi"}
            </span>
          )}
        </div>
        {!duitkuStatus ? (
          <p className="text-sm text-slate-600">Memuat status...</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Mode</p>
                <p className="font-semibold text-slate-900">
                  {duitkuStatus.production ? "Production" : "Sandbox (uji coba)"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Merchant Code</p>
                <p className={`font-semibold ${duitkuStatus.merchantCodeSet ? "text-emerald-700" : "text-rose-600"}`}>
                  {duitkuStatus.merchantCodeSet ? "✓ Terisi" : "✗ Kosong"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">API Key</p>
                <p className={`font-semibold ${duitkuStatus.apiKeySet ? "text-emerald-700" : "text-rose-600"}`}>
                  {duitkuStatus.apiKeySet ? "✓ Terisi" : "✗ Kosong"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">API</p>
                <p className="font-semibold text-slate-900">{duitkuStatus.baseUrl}</p>
              </div>
            </div>

            <div className="bg-sky-50 rounded-xl p-3.5 border border-sky-200">
              <p className="text-xs font-semibold text-sky-900 mb-1">🔗 URL Callback (isi di Dashboard Duitku → Settings → Callback URL)</p>
              <code className="text-xs text-sky-800 break-all bg-white px-2.5 py-1 rounded-lg border border-sky-100 font-mono block">{duitkuStatus.webhookUrl}</code>
            </div>

            <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <li>Daftar di <b>member.duitku.com</b> (mode Sandbox untuk uji coba).</li>
              <li>Salin <b>Merchant Code</b> & <b>API Key</b> (menu Settings).</li>
              <li>Isi di file <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">.env</code>: <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">DUITKU_MERCHANT_CODE</code>, <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">DUITKU_API_KEY</code> (dan <code className="bg-slate-200/70 text-slate-800 px-1.5 py-0.5 rounded font-mono">DUITKU_IS_PRODUCTION</code> untuk production).</li>
              <li>Restart server, lalu tombol <b>⚡ Bayar Online</b> otomatis muncul di halaman publik /bayar & /bayar-tagihan.</li>
              <li>Pembayaran yang sukses diverifikasi otomatis via callback Duitku (tanpa perlu verifikasi admin).</li>
            </ol>
          </div>
        )}
      </div>

      {/* Integrasi Google Contacts (Google People API) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📇</span>
            <div>
              <h2 className="font-semibold text-slate-900">Google Contacts (Google People API)</h2>
              <p className="text-xs text-slate-500">Sinkronisasi otomatis seluruh data kontak pelanggan ke akun Google / Gmail</p>
            </div>
          </div>
          {googleStatus && (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                googleStatus.authorized
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : googleStatus.configured
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-slate-100 border border-slate-200 text-slate-600"
              }`}
            >
              {googleStatus.authorized
                ? `✓ Terhubung (${googleStatus.targetEmail || "Google"})`
                : googleStatus.configured
                ? "Siap Otorisasi"
                : "Belum Dikonfigurasi"}
            </span>
          )}
        </div>

        {!googleStatus ? (
          <p className="text-sm text-slate-600">Memuat status integrasi Google Contacts...</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Email Google Tujuan</p>
                <p className="font-semibold text-slate-900 break-all">
                  {googleStatus.targetEmail || <span className="text-slate-400 italic font-normal">Belum terhubung</span>}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Terakhir Sinkronisasi</p>
                <p className="font-semibold text-slate-900">
                  {googleStatus.lastSyncAt
                    ? new Date(googleStatus.lastSyncAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Belum pernah"}
                </p>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/70">
                <p className="text-xs text-slate-500 font-medium mb-1">Total Pelanggan Aktif</p>
                <p className="font-semibold text-emerald-700">
                  {googleStatus.totalPelanggan ?? 0} Kontak
                </p>
              </div>
            </div>

            {/* Tombol Aksi Otorisasi & Sinkronisasi */}
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-slate-100">
              {!googleStatus.authorized ? (
                googleStatus.authUrl ? (
                  <a
                    href={googleStatus.authUrl}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <span>🔗</span> Hubungkan Akun Google
                  </a>
                ) : (
                  <div className="text-xs text-amber-800 bg-amber-50 px-3.5 py-2.5 rounded-xl border border-amber-200">
                    Isi <code>GOOGLE_CLIENT_ID</code> dan <code>GOOGLE_CLIENT_SECRET</code> di file <code>.env</code> terlebih dahulu untuk mengaktifkan sinkronisasi otomatis.
                  </div>
                )
              ) : (
                <>
                  <button
                    onClick={handleGoogleSync}
                    disabled={googleSyncing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <span>{googleSyncing ? "⏳" : "🔄"}</span>
                    {googleSyncing ? "Sedang Sinkronisasi..." : "Sinkronkan Kontak ke Google Sekarang"}
                  </button>
                  <button
                    onClick={handleGoogleDisconnect}
                    disabled={googleDisconnecting}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all"
                  >
                    <span>✕</span> Putuskan Akun
                  </button>
                </>
              )}

              {/* Unduh File Cadangan Langsung */}
              <a
                href="/api/pelanggan/export-google-contacts?format=csv"
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all ml-auto"
                title="Unduh format CSV resmi Google Contacts untuk diimpor manual"
              >
                <span>📥</span> Unduh CSV Google Contacts
              </a>
              <a
                href="/api/pelanggan/export-google-contacts?format=vcf"
                download
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
                title="Unduh format vCard .vcf universal"
              >
                <span>📱</span> Unduh vCard (.vcf)
              </a>
            </div>

            {/* Info Panduan & Callback */}
            <div className="bg-sky-50 rounded-xl p-3.5 border border-sky-200 text-xs">
              <p className="font-semibold text-sky-900 mb-1">🔗 Authorized Redirect URI (isi di Google Cloud Console → Credentials → OAuth 2.0 Client ID):</p>
              <code className="text-xs text-sky-800 break-all bg-white px-2.5 py-1 rounded-lg border border-sky-100 font-mono block">
                {googleStatus.redirectUri || "http://localhost:3000/api/integrasi/google-contacts/callback"}
              </code>
              <p className="mt-2 text-sky-700">
                💡 Semua kontak yang disinkronkan akan diberi label grup <b>Pelanggan WastePay</b> dan diformat rapi dengan nomor telepon, alamat, catatan status, serta kode pelanggan unik.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* STUDIO PAJAK DAERAH, DENDA & TEMPLATE NOTIFIKASI WHATSAPP (60/40 LAYOUT) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 flex items-center justify-center text-xl">
              💬
            </span>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">
                Studio Pajak Daerah, Denda & Template Notifikasi WA
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfigurasi persentase tarif, aturan denda, dan kustomisasi template pesan WhatsApp dengan pratinjau balon interaktif
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Preview Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* KOLOM KIRI (60%): FORM KONFIGURASI & EDITOR TEMPLATE */}
          <div className="lg:col-span-7 space-y-5">
            <form onSubmit={handleSaveTarif} className="space-y-5">
              {/* Parameter Angka: Pajak Daerah & Denda */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="pajak" className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Pajak Daerah (%)
                    </label>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      PPN Daerah
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="pajak"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={tarifSettings.PAJAK_DAERAH_RATE}
                      onChange={(e) =>
                        setTarifSettings({
                          ...tarifSettings,
                          PAJAK_DAERAH_RATE: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Simulasi: Tarif pokok Rp 50.000 + Pajak Rp{" "}
                    <span className="font-bold text-slate-700">
                      {Math.round(50000 * ((tarifSettings.PAJAK_DAERAH_RATE || 0) / 100)).toLocaleString("id-ID")}
                    </span>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="denda" className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Denda Keterlambatan (%/bln)
                    </label>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      Akumulatif
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="denda"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={tarifSettings.DENDA_KETERLAMBATAN_RATE}
                      onChange={(e) =>
                        setTarifSettings({
                          ...tarifSettings,
                          DENDA_KETERLAMBATAN_RATE: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Simulasi: Denda keterlambatan 1 bulan Rp{" "}
                    <span className="font-bold text-slate-700">
                      {Math.round(50000 * ((tarifSettings.DENDA_KETERLAMBATAN_RATE || 0) / 100)).toLocaleString("id-ID")}
                    </span>
                  </p>
                </div>
              </div>

              {/* Editor Template WhatsApp & Tap-to-Insert Chips */}
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Template Pesan Tagihan WhatsApp
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Gunakan format WhatsApp seperti <code className="bg-slate-200/70 text-slate-800 px-1 py-0.5 rounded font-mono text-[10px]">*tebal*</code> dan klik chip variabel di bawah untuk menyisipkan data secara instan
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTarifSettings((prev) => ({
                        ...prev,
                        WA_TEMPLATE_TAGIHAN:
                          'Halo Bpk/Ibu *{nama}* ({kode_pelanggan}),\n\nBerikut rincian tagihan retribusi sampah CV Tiga Putra Semesta (UPS HERU) untuk periode *{bulan}*:\n\n• Tarif Pokok: *{nominal_pokok}*\n• Pajak Daerah ({pajak_persen}%): *{pajak_daerah}*\n• Denda Keterlambatan: *{denda}*\n----------------------------------\n*Total Tagihan: {total_tagihan}*\n\nJatuh tempo: *{jatuh_tempo}*\nLink pembayaran & rincian: {link_pembayaran}\n\nTerima kasih atas partisipasi Anda dalam menjaga kebersihan lingkungan.',
                      }))
                    }
                    className="text-[11px] font-semibold text-slate-600 hover:text-emerald-700 underline underline-offset-2 shrink-0 self-start sm:self-auto"
                  >
                    ↺ Reset Template Standar
                  </button>
                </div>

                {/* Variable Chips Bar */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tap to Insert Variable Chip:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {waVariableChips.map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => insertWaChip(chip.label)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 text-xs font-mono font-medium text-slate-700 active:scale-95 transition-all shadow-2xs group"
                        title={chip.desc}
                      >
                        <span className="text-emerald-600 font-bold group-hover:scale-110 transition-transform">+</span>
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  rows={9}
                  value={tarifSettings.WA_TEMPLATE_TAGIHAN || ""}
                  onChange={(e) =>
                    setTarifSettings({ ...tarifSettings, WA_TEMPLATE_TAGIHAN: e.target.value })
                  }
                  placeholder="Ketik template pesan WhatsApp di sini..."
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={tarifSaving}
                  className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                >
                  {tarifSaving ? "Menyimpan Perubahan..." : "💾 Simpan Parameter Tarif & Template WA"}
                </button>
              </div>
            </form>
          </div>

          {/* KOLOM KANAN (40%): LIVE WHATSAPP BUBBLE PREVIEW (#DCF8C6) */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-slate-900/5 p-4 rounded-3xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📱</span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Live WhatsApp Bubble Preview
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  #DCF8C6
                </span>
              </div>

              {/* SIMULATED PHONE CHAT SCREEN */}
              <div className="w-full bg-[#EFEAE2] rounded-2xl overflow-hidden border border-slate-300 shadow-md">
                {/* Chat Top App Bar */}
                <div className="bg-[#075E54] text-white px-3.5 py-2.5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <svg className="w-4 h-4 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <div className="w-8 h-8 rounded-full bg-emerald-600 border border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                      UPS
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs truncate">UPS HERU WastePay</span>
                        <svg className="w-3.5 h-3.5 text-emerald-300 shrink-0 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <p className="text-[10px] text-emerald-100/90 truncate">Akun Bisnis Resmi CV Tiga Putra Semesta</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-80">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </div>
                </div>

                {/* Date Pill Divider */}
                <div className="py-2.5 flex justify-center">
                  <span className="bg-white/90 shadow-2xs text-[10px] font-bold text-slate-600 px-3 py-0.5 rounded-lg border border-slate-200/50">
                    HARI INI
                  </span>
                </div>

                {/* Simulated Outbound WhatsApp Bubble (#DCF8C6) */}
                <div className="px-3 pb-3 flex justify-end">
                  <div className="relative max-w-[94%] bg-[#DCF8C6] border border-[#bbf7d0] rounded-2xl rounded-tr-xs p-3 shadow-sm">
                    {/* Bubble Content */}
                    <div className="text-[12px] sm:text-[13px] text-slate-900 leading-relaxed font-sans select-none">
                      {renderWhatsAppFormattedText(simulatedWaMessage)}
                    </div>

                    {/* Timestamp & Double Blue Checkmark */}
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-500 font-medium">
                      <span>09:42</span>
                      <span className="text-[#34B7F1] font-bold tracking-tighter" title="Terkirim & Dibaca (Read Receipts)">
                        ✓✓
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informative Footer Box */}
              <div className="mt-3 bg-white/80 border border-slate-200/70 rounded-xl p-2.5 text-[11px] text-slate-600 flex items-start gap-2">
                <span className="text-base shrink-0">💡</span>
                <p className="leading-snug">
                  Balon pratinjau merender pesan secara langsung dengan angka simulasi: pokok <span className="font-bold text-slate-800">Rp 50.000</span>, Pajak Daerah <span className="font-bold text-emerald-800">{tarifSettings.PAJAK_DAERAH_RATE || 0}%</span>, dan denda <span className="font-bold text-amber-800">{tarifSettings.DENDA_KETERLAMBATAN_RATE || 0}%</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keamanan Akun */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-1">Keamanan Akun</h2>
        <p className="text-sm text-slate-500 mb-4">Ganti password akun Anda</p>
        <form onSubmit={handleGantiPassword} className="space-y-3.5 max-w-md">
          <div>
            <label htmlFor="pw-lama" className="block text-sm font-medium text-slate-700 mb-1.5">Password Lama</label>
            <input
              id="pw-lama"
              type="password"
              value={pwForm.passwordLama}
              onChange={(e) => setPwForm({ ...pwForm, passwordLama: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              required
            />
          </div>
          <div>
            <label htmlFor="pw-baru" className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru (min. 8 karakter)</label>
            <input
              id="pw-baru"
              type="password"
              value={pwForm.passwordBaru}
              onChange={(e) => setPwForm({ ...pwForm, passwordBaru: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              minLength={8}
              required
            />
          </div>
          <div>
            <label htmlFor="pw-konfirmasi" className="block text-sm font-medium text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
            <input
              id="pw-konfirmasi"
              type="password"
              value={pwForm.konfirmasi}
              onChange={(e) => setPwForm({ ...pwForm, konfirmasi: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              minLength={8}
              required
            />
          </div>
          {pwError && <p className="text-sm text-rose-600">{pwError}</p>}
          {pwMessage && <p className="text-sm text-emerald-700">✓ {pwMessage}</p>}
          <button
            type="submit"
            disabled={pwLoading}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-sm active:scale-95 transition-all"
          >
            {pwLoading ? "Menyimpan..." : "Ganti Password"}
          </button>
        </form>
      </div>

      {/* Informasi Sistem */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Informasi Sistem</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <p>Dashboard ini adalah aplikasi manajemen operasional & iuran sampah mandiri (UPS HERU).</p>
          <p>Fitur yang tersedia:</p>
          <ul className="list-disc list-inside space-y-1 ml-2 text-slate-500">
            <li>Manajemen pelanggan per blok pickup & wilayah layanan</li>
            <li>Generate tagihan bulanan otomatis</li>
            <li>Catat pembayaran (tunai, transfer, Duitku payment gateway)</li>
            <li>Manajemen petugas dan rute</li>
            <li>Tracking pengangkutan harian</li>
            <li>Manajemen komplain warga</li>
            <li>Laporan keuangan pemasukan & pengeluaran</li>
            <li>Broadcast pengumuman via WhatsApp</li>
          </ul>
        </div>
      </div>

      {/* MODAL TAMBAH / EDIT BLOK PICKUP */}
      {showWilayahModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div>
                <h2 className="font-bold text-slate-900 text-base">
                  {editingWilayah ? "Edit Blok Pickup" : "Tambah Blok Pickup Layanan"}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unit jemput sampah: Kecamatan → Kelurahan → Nama Blok
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWilayahModal(false);
                  resetWilayahForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitWilayah} className="p-6 space-y-4">
              {formWilayahError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formWilayahError}</span>
                </div>
              )}

              {/* 1. KECAMATAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Kecamatan <span className="text-slate-400 font-normal lowercase">(filter kelurahan)</span>
                </label>
                <select
                  value={formKecamatan}
                  onChange={(e) => {
                    const selectedKec = e.target.value;
                    setFormKecamatan(selectedKec);
                    if (formKelurahanId) {
                      const curKel = kelurahanList.find((k) => k.id.toString() === formKelurahanId);
                      if (curKel && selectedKec && curKel.kecamatan?.toLowerCase() !== selectedKec.toLowerCase()) {
                        setFormKelurahanId("");
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800"
                >
                  <option value="">-- Pilih / Semua Kecamatan di Depok --</option>
                  {availableKecamatanList.map((kec) => (
                    <option key={kec} value={kec}>
                      Kecamatan {kec}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. KELURAHAN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Kelurahan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formKelurahanId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormKelurahanId(val);
                    const kel = kelurahanList.find((k) => k.id.toString() === val);
                    if (kel?.kecamatan) {
                      setFormKecamatan(kel.kecamatan);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-800"
                  required
                >
                  <option value="">-- Pilih Kelurahan --</option>
                  {formKelurahanOptions.map((k) => (
                    <option key={k.id} value={k.id.toString()}>
                      Kelurahan {k.nama} {k.kecamatan ? `(Kec. ${k.kecamatan})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. NAMA BLOK PICKUP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Nama Blok Pickup <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formNamaBlok}
                  onChange={(e) => setFormNamaBlok(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold uppercase tracking-wide text-slate-900"
                  placeholder="Misal: BLOK BAKUNG, BLOK H PUAH"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Area operasional penjemputan sampah warga (misal: Blok Bakung, Perumahan Mawar Blok C).
                </p>
              </div>

              {/* ACCORDION: ADVANCED SETTINGS (ZONA & RT/RW) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedRtRw(!showAdvancedRtRw)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                >
                  <span>{showAdvancedRtRw ? "▼ Sembunyikan" : "▶ Tampilkan"} Pengaturan Tambahan (Zona & RT/RW)</span>
                </button>

                {showAdvancedRtRw && (
                  <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 animate-in fade-in duration-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Zona Angkut</label>
                      <select
                        value={formZonaId}
                        onChange={(e) => setFormZonaId(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      >
                        <option value="">Tanpa zona</option>
                        {zonaList.map((z) => (
                          <option key={z.id} value={z.id.toString()}>
                            {z.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">RT (Opsional)</label>
                        <input
                          type="text"
                          value={formRt}
                          onChange={(e) => setFormRt(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                          placeholder="001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">RW (Opsional)</label>
                        <input
                          type="text"
                          value={formRw}
                          onChange={(e) => setFormRw(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono"
                          placeholder="003"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* TOMBOL SIMPAN / BATAL */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  disabled={savingWilayah}
                  onClick={() => {
                    setShowWilayahModal(false);
                    resetWilayahForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingWilayah}
                  className="flex-1 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingWilayah ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingWilayah ? "Simpan Perubahan" : "Simpan Blok Pickup"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE WILAYAH */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Blok Pickup"
        message={`Yakin ingin menghapus blok pickup "${deleteTarget?.nama}" (${deleteTarget?.kelurahanRef?.nama || deleteTarget?.kelurahan || "—"})? Penghapusan akan ditolak jika masih terdapat pelanggan aktif yang terdaftar di blok ini.`}
        confirmText="Ya, Hapus Blok"
        cancelText="Batal"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {/* CONFIRM DEDUP MERGE */}
      <ConfirmDialog
        open={showDedupConfirm}
        title="Gabung & Bersihkan Blok Duplikat"
        message={`Sistem akan menggabungkan ${duplicateStats.count} data blok pickup duplikat ke satu record utama. Seluruh riwayat pelanggan, jadwal rute, dan petugas akan dialihkan secara otomatis tanpa ada data yang hilang. Lanjutkan pembersihan?`}
        confirmText="Ya, Gabung & Bersihkan"
        cancelText="Batal"
        variant="default"
        onConfirm={handleRunDedup}
        onCancel={() => setShowDedupConfirm(false)}
        loading={dedupLoading}
      />
    </div>
  );
}
