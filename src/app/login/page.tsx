"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import O2WLogo from "@/components/O2WLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-black px-4 py-10 z-10">
      {/* Global Scanline effect */}
      <div className="scanline" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Header */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="hover:scale-105 transition-transform mb-6">
            <O2WLogo size="lg" />
          </div>
          <h2 className="font-mono text-2xl font-bold text-[var(--neon-cyan)] tracking-widest uppercase glitch-text">
            [ LOGIN_ADMIN_O2W ]
          </h2>
          <p className="text-xs text-slate-400 mt-3 font-mono border-b border-[var(--neon-cyan)] pb-2 inline-block">
            // AUTHORIZED PERSONNEL ONLY
          </p>
        </div>

        {/* Cyber Box Panel */}
        <div className="cyber-box p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[var(--neon-pink)] uppercase tracking-widest flex items-center gap-2" htmlFor="email">
                <span className="w-1.5 h-1.5 bg-[var(--neon-pink)] animate-pulse" />
                Alamat_Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[rgba(255,0,234,0.05)] border border-[var(--neon-pink)] px-4 py-3 text-white text-sm font-mono focus:outline-none focus:shadow-[0_0_15px_rgba(255,0,234,0.3)] transition-all placeholder-slate-600 rounded-none"
                placeholder="admin@o2whero.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-mono text-[var(--neon-yellow)] uppercase tracking-widest flex items-center gap-2" htmlFor="password">
                <span className="w-1.5 h-1.5 bg-[var(--neon-yellow)] animate-pulse" />
                Kata_Sandi
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[rgba(252,238,10,0.05)] border border-[var(--neon-yellow)] px-4 py-3 text-white text-sm font-mono focus:outline-none focus:shadow-[0_0_15px_rgba(252,238,10,0.3)] transition-all placeholder-slate-600 rounded-none"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="border border-red-500 bg-[rgba(255,0,0,0.1)] text-red-500 text-xs font-mono px-4 py-3 text-center uppercase tracking-wider shadow-[0_0_10px_rgba(255,0,0,0.2)]">
                [ERROR] {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--neon-cyan)] hover:bg-white text-black font-mono font-bold text-sm py-4 uppercase tracking-[0.2em] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)]"
              style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))" }}
            >
              {loading ? "MEMVERIFIKASI_DATA..." : "MASUK_SISTEM"}
            </button>
          </form>
        </div>

        <div className="mt-12 text-center text-[9px] font-mono text-slate-500 uppercase tracking-widest">
          <p>&gt; O₂W HERO_ASLI_DEPOK © {new Date().getFullYear()}</p>
          <p className="mt-1 flex items-center justify-center gap-2">
             <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]" /> SERVER_AKTIF
          </p>
        </div>
      </div>
    </div>
  );
}
