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
  create: { label: "Buat", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  update: { label: "Ubah", cls: "bg-sky-50 text-sky-700 border border-sky-200" },
  delete: { label: "Hapus", cls: "bg-rose-50 text-rose-700 border border-rose-200" },
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
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none mb-1">Audit Log</h1>
          <p className="text-sm text-slate-500 font-medium">
            Jejak perubahan data oleh pengguna (hanya superadmin)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterEntitas}
          onChange={(e) => setFilterEntitas(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Semua Entitas</option>
          {entitasList.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filterAksi}
          onChange={(e) => setFilterAksi(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        >
          <option value="">Semua Aksi</option>
          <option value="create">Buat</option>
          <option value="update">Ubah</option>
          <option value="delete">Hapus</option>
        </select>
        <button
          onClick={() => fetchData()}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-xs hover:shadow active:scale-[0.98] transition-all"
        >
          Muat Ulang
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-600 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                <th className="text-left px-4 py-3.5">Waktu</th>
                <th className="text-left px-4 py-3.5">Pengguna</th>
                <th className="text-left px-4 py-3.5">Aksi</th>
                <th className="text-left px-4 py-3.5">Entitas</th>
                <th className="text-left px-4 py-3.5">ID</th>
                <th className="text-left px-4 py-3.5">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium text-xs">Memuat log audit...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium text-xs">Belum ada log aktivitas</td></tr>
              ) : (
                logs.map((log) => {
                  const aksi = AKSI_LABEL[log.aksi] ?? { label: log.aksi, cls: "bg-slate-100 border border-slate-200 text-slate-700" };
                  let detail = log.dataBaru;
                  if (!detail && log.dataLama) detail = log.dataLama;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                      <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">{formatWaktu(log.createdAt)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{log.user?.nama || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${aksi.cls}`}>
                          {aksi.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{log.entitas}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{log.entitasId}</td>
                      <td className="px-4 py-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-emerald-600 hover:text-emerald-700 font-medium">Lihat detail</summary>
                          <pre className="mt-2 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl p-3 text-[11px] font-mono overflow-x-auto max-h-40">
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
