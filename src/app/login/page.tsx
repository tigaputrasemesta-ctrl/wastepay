"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-asphalt px-4 py-10">
      {/* Watermark display */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <span className="font-display text-[26vw] leading-none text-bone/[0.025] -translate-y-10">
          UPS
        </span>
      </div>

      {/* Hazard band kiri */}
      <div
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-3 hazard opacity-30"
      />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-reveal-up">
          <div className="inline-flex flex-col items-center">
            <div className="w-16 h-16 chamfer bg-vest flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(183,225,60,0.25)]">
              <span className="font-display text-lg text-asphalt-deep leading-none tracking-tight">O2W</span>
            </div>
            <h1 className="font-display text-4xl tracking-wide text-bone">
              O2W Hero Zero Waste
            </h1>
            <p className="stencil text-vest mt-2 flex items-center gap-2">
              <span className="w-6 h-0.5 hazard inline-block" />
              Unit Pengelola Sampah
              <span className="w-6 h-0.5 hazard inline-block" />
            </p>
          </div>
        </div>

        {/* Panel */}
        <div className="panel animate-reveal-up d-2">
          {/* Header strip panel */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-asphalt-line bg-asphalt-deep">
            <span className="stencil text-bone-dim">Akses Terminal</span>
            <span className="stencil text-bone-faint">AUTH / 01</span>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="label" htmlFor="email">
                Email Operator
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="admin.herozerowaste@gmail.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label" htmlFor="password">
                Kata Sandi
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="border border-danger/40 bg-danger/10 text-danger text-sm px-3 py-2.5 flex items-center gap-2 animate-fade-in">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-mono text-xs">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary chamfer-sm w-full py-3"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-asphalt-deep/40 border-t-asphalt-deep rounded-full animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk ke Sistem
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="border-t border-asphalt-line px-5 py-2.5 flex items-center justify-between bg-asphalt-deep">
            <span className="stencil text-[9px] text-bone-faint">
              Sistem v0.1 — Terenkripsi
            </span>
            <span className="w-3 h-3 rounded-full bg-vest animate-blink" />
          </div>
        </div>

        <p className="stencil text-[9px] text-bone-faint text-center mt-6">
          O2W Hero Zero Waste © {new Date().getFullYear()} — Pengelolaan Retribusi Sampah
        </p>
      </div>
    </div>
  );
}
