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
  create: { label: "Buat", cls: "bg-vest/10 text-emerald-800" },
  update: { label: "Ubah", cls: "bg-vest/10 text-blue-800" },
  delete: { label: "Hapus", cls: "bg-danger/10 text-red-800" },
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
          <h1 className="font-display text-2xl text-bone">Audit Log</h1>
          <p className="text-sm text-bone-dim mt-1">
            Jejak perubahan data oleh pengguna (hanya superadmin)
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filterEntitas}
          onChange={(e) => setFilterEntitas(e.target.value)}
          className="px-3 py-2 border border-asphalt-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vest"
        >
          <option value="">Semua Entitas</option>
          {entitasList.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={filterAksi}
          onChange={(e) => setFilterAksi(e.target.value)}
          className="px-3 py-2 border border-asphalt-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vest"
        >
          <option value="">Semua Aksi</option>
          <option value="create">Buat</option>
          <option value="update">Ubah</option>
          <option value="delete">Hapus</option>
        </select>
        <button
          onClick={() => fetchData()}
          className="px-4 py-2 border border-asphalt-line rounded-lg text-sm text-bone-dim hover:bg-asphalt-raised transition"
        >
          Muat Ulang
        </button>
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-asphalt-deep/40 border-b border-asphalt-line">
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Waktu</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Pengguna</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Aksi</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Entitas</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">ID</th>
                <th className="text-left px-4 py-3 font-medium text-bone-dim">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Memuat...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-bone-faint">Belum ada log</td></tr>
              ) : (
                logs.map((log) => {
                  const aksi = AKSI_LABEL[log.aksi] ?? { label: log.aksi, cls: "bg-asphalt-raised text-bone-dim" };
                  let detail = log.dataBaru;
                  if (!detail && log.dataLama) detail = log.dataLama;
                  return (
                    <tr key={log.id} className="border-b border-asphalt-line hover:bg-asphalt-raised">
                      <td className="px-4 py-3 text-bone-dim text-xs whitespace-nowrap">{formatWaktu(log.createdAt)}</td>
                      <td className="px-4 py-3 text-bone-dim">{log.user?.nama || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${aksi.cls}`}>
                          {aksi.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-bone">{log.entitas}</td>
                      <td className="px-4 py-3 text-bone-dim">{log.entitasId}</td>
                      <td className="px-4 py-3">
                        <details className="text-xs">
                          <summary className="cursor-pointer text-vest hover:text-vest font-medium">Lihat detail</summary>
                          <pre className="mt-2 bg-asphalt-deep/40 border border-asphalt-line rounded-lg p-2 text-[11px] text-bone-dim overflow-x-auto max-h-40">
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
