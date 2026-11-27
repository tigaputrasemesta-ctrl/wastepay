"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, LogIn, Smartphone, ShieldCheck, Loader2, Database, Sparkles, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { NativeGuardedLink } from "@/components/mobile/LandingApkBanner";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCore, setIsCore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const portalParam = p.get("portal")?.toLowerCase();
      if (portalParam === "core" || portalParam === "o2w" || portalParam === "hero") {
        setIsCore(true);
      } else if (portalParam === "tenant" || portalParam === "upsheru" || portalParam === "mitra") {
        setIsCore(false);
      } else {
        const h = window.location.hostname.toLowerCase();
        setIsCore(h.includes("o2whero.com") || h.startsWith("o2w-") || h.includes("core."));
      }

      const err = p.get("error");
      if (err === "core_restricted") {
        setError("Akun operasional mitra tidak diizinkan masuk ke Core SaaS Hub. Silakan buka domain portal resmi mitra Anda.");
      } else if (err === "tenant_mismatch") {
        setError("Akun Anda tidak terdaftar pada layanan tenant ini. Silakan hubungi admin atau login melalui domain mitra Anda.");
      } else if (err === "sesi") {
        setError("Sesi Anda telah berakhir. Silakan masuk kembali.");
      } else if (err === "akses") {
        setError("Anda tidak memiliki hak akses ke halaman tersebut.");
      }
    }
  }, []);

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
        if (data.token && typeof window !== "undefined") {
          try {
            const isMobileContext =
              data.user?.role === "petugas" ||
              window.location.search.includes("platform=mobile") ||
              /Android.*wv|MobileApp/i.test(navigator.userAgent);

            if (isMobileContext) {
              localStorage.setItem("wp_mobile_token", data.token);
              localStorage.setItem("wp_mobile_user", JSON.stringify(data.user));
            } else {
              // Bersihkan token dari localStorage jika login di browser desktop biasa
              localStorage.removeItem("wp_mobile_token");
              localStorage.removeItem("wp_mobile_user");
            }
          } catch {}
        }
        
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
        
        // Arahkan ke /tenants hanya jika login di domain Core SaaS (o2whero.com).
        // Pada domain mitra operasional (upsheru.com dll), SELALU arahkan ke /dashboard (atau /m untuk petugas).
        let defaultTarget = "/dashboard";
        if (isCore) {
          defaultTarget = "/tenants";
        }
        const target = safeNext || (data.user?.role === "petugas" ? "/m" : defaultTarget);
        window.location.href = target;
      }
    } catch {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div
            className={`w-12 h-12 text-white rounded-xl flex items-center justify-center mb-4 shadow-sm transition-all ${
              isCore
                ? "bg-gradient-to-tr from-sky-600 to-teal-500 shadow-sky-600/20 font-black text-lg"
                : "bg-emerald-700 shadow-emerald-700/20"
            }`}
          >
            {isCore ? "O2W" : <Truck strokeWidth={2.5} className="w-6 h-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-zinc-100 transition-colors">
            {isCore ? "O2W HERO Platform" : "UPS HERU Portal"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 transition-colors">
            {isCore
              ? "SaaS Management & Multi-Tenant Core Hub"
              : "Sistem Informasi Pengelolaan & Retribusi"}
          </p>
        </div>

        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Kembali ke Beranda</span>
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-900 px-6 sm:px-10 py-8 shadow-sm border border-slate-200/60 dark:border-zinc-800 rounded-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                {isCore ? "Email Login Super Admin" : "Alamat Email atau No. HP"}
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-slate-900 dark:text-zinc-100 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder-zinc-500 ${
                  isCore
                    ? "focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
                    : "focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                }`}
                placeholder={isCore ? "admin@upsheru.com" : "petugas@upsheru.com atau 0812xxxx"}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-lg pl-4 pr-11 py-2.5 text-slate-900 dark:text-zinc-100 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder-zinc-500 ${
                    isCore
                      ? "focus:ring-2 focus:ring-sky-600/20 focus:border-sky-600"
                      : "focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Ingat Saya</span>
              </label>
              <a
                href="https://wa.me/6281400782617?text=Halo%20Admin%20UPS%20HERU,%20saya%20butuh%20bantuan%20reset%20kata%20sandi%20akun."
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Lupa Kata Sandi?
              </a>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 text-red-600 dark:text-red-400 text-sm">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                isCore
                  ? "bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20"
                  : "bg-emerald-700 hover:bg-emerald-800 shadow-sm"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sistem</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex justify-center">
          <NativeGuardedLink
            href="/unduh"
            className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-slate-400 group-hover:text-emerald-800 transition-colors" />
            <span>Unduh Aplikasi Mobile</span>
          </NativeGuardedLink>
        </div>
      </div>
    </main>
  );
}
