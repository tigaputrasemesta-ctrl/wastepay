"use client";

import React from "react";
import {
  TrendingUp,
  Receipt,
  Truck,
  Headphones,
  Zap,
  Pause,
  Play,
  FileCheck2,
  Activity,
  Sparkles,
} from "lucide-react";

export type AgentId = "eksekutif" | "tagihan" | "armada" | "layanan" | "growth";
export type AgentStatus = "active" | "paused" | "new_report";

export interface ActivityLog {
  id: string;
  time: string;
  text: string;
  type?: "info" | "success" | "warning";
}

export interface AgentDeskMeta {
  id: AgentId;
  title: string;
  shortTitle: string;
  roleDescription: string;
  icon: any;
  accentColor: string;
  svgPos: { x: number; y: number };
}

export const AGENT_DESKS: Record<AgentId, AgentDeskMeta> = {
  eksekutif: {
    id: "eksekutif",
    title: "Meja Eksekutif & Keuangan",
    shortTitle: "Eksekutif",
    roleDescription: "Audit arus kas & rekomendasi strategis pimpinan",
    icon: TrendingUp,
    accentColor: "emerald",
    svgPos: { x: 400, y: 72 },
  },
  tagihan: {
    id: "tagihan",
    title: "Meja Analis Tagihan & Tunggakan",
    shortTitle: "Analis Tagihan",
    roleDescription: "Monitoring piutang & segmentasi tunggakan warga",
    icon: Receipt,
    accentColor: "amber",
    svgPos: { x: 650, y: 145 },
  },
  armada: {
    id: "armada",
    title: "Meja Analis Armada & Komplain",
    shortTitle: "Analis Armada",
    roleDescription: "Evaluasi rute armada & titik rawan keterlambatan",
    icon: Truck,
    accentColor: "blue",
    svgPos: { x: 610, y: 325 },
  },
  layanan: {
    id: "layanan",
    title: "Meja Analis Layanan Warga / CS",
    shortTitle: "Layanan Warga",
    roleDescription: "Analisis kepuasan warga, SLA tiket & tren FAQ",
    icon: Headphones,
    accentColor: "teal",
    svgPos: { x: 190, y: 325 },
  },
  growth: {
    id: "growth",
    title: "Meja Analis Pertumbuhan & B2B",
    shortTitle: "Growth & B2B",
    roleDescription: "Peluang penyesuaian tarif & ekspansi klaster baru",
    icon: Zap,
    accentColor: "purple",
    svgPos: { x: 150, y: 145 },
  },
};

interface VirtualCommandRoomProps {
  activeAgent: AgentId;
  onSelectAgent: (id: AgentId) => void;
  agentStatuses: Record<AgentId, AgentStatus>;
  onTogglePause: (id: AgentId) => void;
  pendingReportCount: number;
  archivedReportCount: number;
  activityLogs: ActivityLog[];
}

export default function VirtualCommandRoom({
  activeAgent,
  onSelectAgent,
  agentStatuses,
  onTogglePause,
  pendingReportCount,
  archivedReportCount,
  activityLogs,
}: VirtualCommandRoomProps) {
  const getStatusBadge = (status: AgentStatus) => {
    switch (status) {
      case "active":
        return {
          label: "Aktif Bekerja",
          bgClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
          dotClass: "bg-emerald-500 animate-pulse",
        };
      case "new_report":
        return {
          label: "Laporan Baru",
          bgClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
          dotClass: "bg-amber-500 animate-ping",
        };
      case "paused":
        return {
          label: "Dijeda",
          bgClass: "bg-slate-500/15 text-slate-700 dark:text-zinc-400 border-slate-500/30",
          dotClass: "bg-slate-400",
        };
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
      {/* Header Room Info */}
      <div className="p-4 border-b border-gray-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-emerald-50/20 dark:from-zinc-900 dark:via-zinc-900 dark:to-emerald-950/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-sm">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Ruang Kerja Virtual AI (AI Command Room)
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <Sparkles className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Mode Pelaporan Internal
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400">
              5 Meja Agen Spesialis terhubung otomatis menyuplai ringkasan operasional ke Pusat Laporan.
            </p>
          </div>
        </div>

        {/* Central Hub Quick Stats */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center gap-2 text-xs">
            <FileCheck2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span className="text-slate-700 dark:text-zinc-300 font-medium">Pusat Laporan:</span>
            <span className="font-bold text-amber-700 dark:text-amber-400">{pendingReportCount} Menunggu</span>
            <span className="text-slate-400 dark:text-zinc-500">•</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">{archivedReportCount} Disahkan</span>
          </div>
        </div>
      </div>

      {/* DESKTOP ISOMETRIC SVG ROOM VIEW (hidden on < 768px) */}
      <div className="hidden md:block relative w-full h-[380px] bg-slate-950/95 dark:bg-black overflow-hidden select-none">
        <svg
          viewBox="0 0 800 420"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="isoGrid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M 0 10 L 20 0 L 40 10 L 20 20 Z"
                fill="none"
                stroke="rgba(16, 185, 129, 0.07)"
                strokeWidth="0.8"
              />
            </pattern>

            {/* Glowing Gradients */}
            <linearGradient id="centerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>

            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Iso Floor */}
          <rect width="800" height="420" fill="#080e14" />
          <rect width="800" height="420" fill="url(#isoGrid)" />

          {/* Ambient Center Lighting */}
          <ellipse cx="400" cy="220" rx="280" ry="140" fill="rgba(16, 185, 129, 0.04)" />

          {/* DATA STREAM LINES (Desks to Center Console) */}
          {(Object.keys(AGENT_DESKS) as AgentId[]).map((deskId) => {
            const desk = AGENT_DESKS[deskId];
            const isDeskActive = activeAgent === deskId;
            const status = agentStatuses[deskId];
            const isPaused = status === "paused";

            const strokeColor = isPaused
              ? "rgba(148, 163, 184, 0.25)"
              : isDeskActive
              ? "#10b981"
              : "rgba(16, 185, 129, 0.4)";

            return (
              <g key={`stream-${deskId}`}>
                <line
                  x1={desk.svgPos.x}
                  y1={desk.svgPos.y}
                  x2={400}
                  y2={220}
                  stroke={strokeColor}
                  strokeWidth={isDeskActive ? 2.5 : 1.5}
                  strokeDasharray={isPaused ? "none" : "6 6"}
                  filter={isDeskActive ? "url(#glowFilter)" : undefined}
                >
                  {!isPaused && (
                    <animate
                      attributeName="stroke-dashoffset"
                      from="24"
                      to="0"
                      dur={isDeskActive ? "1s" : "2s"}
                      repeatCount="indefinite"
                    />
                  )}
                </line>

                {/* Animated Pulsing Packet */}
                {!isPaused && (
                  <circle r={isDeskActive ? 3.5 : 2.5} fill={isDeskActive ? "#34d399" : "#6ee7b7"}>
                    <animateMotion
                      path={`M ${desk.svgPos.x} ${desk.svgPos.y} L 400 220`}
                      dur={isDeskActive ? "1.8s" : "3s"}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          })}

          {/* CENTRAL CONSOLE: PUSAT LAPORAN */}
          <g transform="translate(400, 220)" className="cursor-default">
            {/* Hexagonal / Radial Console Base */}
            <circle r="46" fill="#064e3b" fillOpacity="0.4" stroke="#059669" strokeWidth="1.5" />
            <circle
              r="38"
              fill="#022c22"
              stroke="#10b981"
              strokeWidth="2"
              filter="url(#glowFilter)"
            />

            {/* Inner Dashboard Core */}
            <circle r="22" fill="#047857" fillOpacity="0.6" />
            <circle r="8" fill="#a7f3d0" className="animate-pulse" />

            {/* Center Console Labels */}
            <text
              y="-12"
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="10"
              fontWeight="bold"
              letterSpacing="0.05em"
              fontFamily="sans-serif"
            >
              PUSAT LAPORAN
            </text>
            <text
              y="2"
              textAnchor="middle"
              fill="#34d399"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {pendingReportCount} Baru
            </text>
            <text
              y="14"
              textAnchor="middle"
              fill="#94a3b8"
              fontSize="8"
              fontFamily="sans-serif"
            >
              {archivedReportCount} Diarsipkan
            </text>
          </g>

          {/* 5 AGENT DESKS */}
          {(Object.keys(AGENT_DESKS) as AgentId[]).map((deskId) => {
            const desk = AGENT_DESKS[deskId];
            const isDeskActive = activeAgent === deskId;
            const status = agentStatuses[deskId];
            const statusInfo = getStatusBadge(status);

            const { x, y } = desk.svgPos;

            return (
              <g
                key={`desk-${deskId}`}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer group"
                onClick={() => onSelectAgent(deskId)}
              >
                {/* Active Selection Glow Ring */}
                {isDeskActive && (
                  <ellipse
                    cx="0"
                    cy="0"
                    rx="68"
                    ry="38"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                    filter="url(#glowFilter)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0"
                      to="360"
                      dur="12s"
                      repeatCount="indefinite"
                    />
                  </ellipse>
                )}

                {/* Desk Base Isometric Platform */}
                <ellipse
                  cx="0"
                  cy="4"
                  rx="62"
                  ry="32"
                  fill={isDeskActive ? "#064e3b" : "#0f172a"}
                  stroke={isDeskActive ? "#10b981" : "#334155"}
                  strokeWidth={isDeskActive ? "2" : "1"}
                  className="transition-colors duration-200"
                />

                {/* Desk Terminal Top */}
                <ellipse
                  cx="0"
                  cy="-4"
                  rx="54"
                  ry="26"
                  fill={isDeskActive ? "#022c22" : "#1e293b"}
                  stroke={isDeskActive ? "#34d399" : "#475569"}
                  strokeWidth="1"
                />

                {/* Desk Monitor Graphic */}
                <rect
                  x="-18"
                  y="-22"
                  width="36"
                  height="16"
                  rx="2"
                  fill="#020617"
                  stroke={isDeskActive ? "#10b981" : "#64748b"}
                  strokeWidth="1"
                />
                <line x1="-12" y1="-14" x2="12" y2="-14" stroke={isDeskActive ? "#34d399" : "#38bdf8"} strokeWidth="1.5" />
                <line x1="-12" y1="-10" x2="6" y2="-10" stroke={isDeskActive ? "#a7f3d0" : "#94a3b8"} strokeWidth="1.5" />

                {/* Desk Status Dot */}
                <circle
                  cx="22"
                  cy="-20"
                  r="4"
                  fill={
                    status === "active"
                      ? "#10b981"
                      : status === "new_report"
                      ? "#f59e0b"
                      : "#94a3b8"
                  }
                />

                {/* Agent Short Title */}
                <text
                  x="0"
                  y="12"
                  textAnchor="middle"
                  fill={isDeskActive ? "#ffffff" : "#e2e8f0"}
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {desk.shortTitle}
                </text>

                {/* Status Subtitle Text */}
                <text
                  x="0"
                  y="24"
                  textAnchor="middle"
                  fill={isDeskActive ? "#6ee7b7" : "#94a3b8"}
                  fontSize="9"
                  fontFamily="sans-serif"
                >
                  {statusInfo.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Quick Switcher / Status Toggles on SVG */}
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md rounded-xl p-2 border border-slate-700/80 text-[11px] text-white flex items-center gap-2">
          <span className="font-semibold text-slate-300">Meja Terpilih:</span>
          <span className="font-bold text-emerald-400">{AGENT_DESKS[activeAgent].title}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePause(activeAgent);
            }}
            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 border border-slate-600 transition"
          >
            {agentStatuses[activeAgent] === "paused" ? (
              <>
                <Play className="w-3 h-3 text-emerald-400" /> Aktifkan Meja
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-amber-400" /> Jeda Meja
              </>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE DESK SWITCHER PILLS (< 768px: 100% responsive on 375px–390px screens) */}
      <div className="md:hidden p-3 bg-slate-50 dark:bg-zinc-950/70 border-b border-gray-200 dark:border-zinc-800">
        <p className="text-[11px] font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-2">
          Pilih Meja Kerja Agen:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(AGENT_DESKS) as AgentId[]).map((deskId) => {
            const desk = AGENT_DESKS[deskId];
            const isSelected = activeAgent === deskId;
            const status = agentStatuses[deskId];
            const statusInfo = getStatusBadge(status);
            const Icon = desk.icon;

            return (
              <button
                key={deskId}
                type="button"
                onClick={() => onSelectAgent(deskId)}
                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition ${
                  isSelected
                    ? "bg-white dark:bg-zinc-800 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                    : "bg-white/80 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
                </div>
                <div className="mt-1.5">
                  <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {desk.shortTitle}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">
                    {statusInfo.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* REAL-TIME ACTIVITY LOGS STRIP */}
      <div className="p-3 bg-slate-50 dark:bg-zinc-950/40 border-t border-gray-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-medium">
          <Activity className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" />
          <span className="font-bold whitespace-nowrap">Log Aktivitas Ruangan:</span>
          {activityLogs.length > 0 ? (
            <span className="truncate text-slate-600 dark:text-zinc-400">
              <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 mr-1.5">
                [{activityLogs[0].time}]
              </span>
              {activityLogs[0].text}
            </span>
          ) : (
            <span className="text-slate-400 italic">Semua 5 meja agen beroperasi normal.</span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <button
            type="button"
            onClick={() => onTogglePause(activeAgent)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-gray-300 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition whitespace-nowrap"
          >
            {agentStatuses[activeAgent] === "paused" ? (
              <>
                <Play className="w-3 h-3 text-emerald-700" /> Aktifkan {AGENT_DESKS[activeAgent].shortTitle}
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-amber-700" /> Jeda {AGENT_DESKS[activeAgent].shortTitle}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
