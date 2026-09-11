"use client";

import { useState, useEffect, useCallback } from "react";

type AuditLogItem = {
  id: number;
  aksi: "create" | "update" | "delete";
  entitas: string;
  entitasId: number;
  dataLama?: string | null;
  dataBaru?: string | null;
  createdAt: string;
  user?: { id: number; nama: string } | null;
};

const AKSI_LABEL: Record<string, { label: string; cls: string }> = {
  create: { label: "Buat", cls: "bg-emerald-400/10 text-emerald-400 border border-emerald-500/30" },
  update: { label: "Ubah", cls: "bg-sky-400/10 text-sky-400 border border-sky-500/30" },
  delete: { label: "Hapus", cls: "bg-danger/10 text-red-400 border border-red-500/30" },
};

function formatWaktu(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEntitas, setFilterEntitas] = useState("");
  const [filterAksi, setFilterAksi] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterEntitas) params.set("entitas", filterEntitas);
      if (filterAksi) params.set("aksi", filterAksi);
      const res = await fetch(`/api/audit-log?${params}&limit=200`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [filterEntitas, filterAksi]);

  useEffect(() => {
    (async () => { await fetchData(); })();
  }, [fetchData]);

  const entitasList = [...new Set(logs.map((l) => l.entitas))].sort();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit Log</h1>
          <p className="text-sm text-gray-600 font-bold mt-1">
            Jejak perubahan data oleh pengguna (hanya superadmin)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterEntitas}
          onChange={(e) => setFilterEntitas(e.target.value)}
          className="px-3 py-2 border border-slate-200/80 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Semua Entitas</option>
          {entitasList.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filterAksi}
          onChange={(e) => setFilterAksi(e.target.value)}
          className="px-3 py-2 border border-slate-200/80 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-black"
        >
          <option value="">Semua Aksi</option>
          <option value="create">Buat</option>
          <option value="update">Ubah</option>
          <option value="delete">Hapus</option>
        </select>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 border border-slate-200/80 rounded-xl text-sm text-slate-700 font-medium hover:bg-slate-50/80 transition transition"
        >
          Muat Ulang
        </button>
      </div>

      {/* Table */}
      <div className="hm-card bg-white p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Waktu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Pengguna</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Aksi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Entitas</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-bold">Belum ada log</td></tr>
              ) : (
                logs.map((log) => {
                  const aksi = AKSI_LABEL[log.aksi] ?? { label: log.aksi, cls: "bg-gray-100 border border-slate-200/80 text-gray-600 font-bold" };
                  let detail = log.dataBaru;
                  if (!detail && log.dataLama) detail = log.dataLama;
                  return (
                    <tr key={log.id} className="border-b border-slate-200 hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 text-gray-600 font-bold text-xs whitespace-nowrap">{formatWaktu(log.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-600 font-bold">{log.user?.nama || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${aksi.cls}`}>
                          {aksi.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-black font-black">{log.entitas}</td>
                      <td className="px-4 py-3 text-gray-600 font-bold">{log.entitasId}</td>
                      <td className="px-4 py-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-green-600 hover:text-green-600 font-medium">Lihat detail</summary>
                          <pre className="mt-2 bg-slate-50 text-slate-700 font-semibold border border-slate-200/80 rounded-none p-2 text-[11px] text-gray-600 font-bold overflow-x-auto max-h-40">
                            {detail || "—"}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
