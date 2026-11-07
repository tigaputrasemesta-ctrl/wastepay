"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, LogIn, Smartphone, ShieldCheck, Loader2 } from "lucide-react";
import { NativeGuardedLink } from "@/components/mobile/LandingApkBanner";

export default function LoginPage() {
  const [email, setEmail] = useState("raka@hero.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function performLogin(targetEmail: string, targetPass: string) {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
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
              localStorage.removeItem("wp_mobile_token");
              localStorage.removeItem("wp_mobile_user");
            }
          } catch {}
        }
        
        const params = new URLSearchParams(window.location.search);
        const next = params.get("next");
        const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
        
        const target = safeNext || (data.user?.role === "petugas" ? "/m" : "/dashboard");
        window.location.href = target;
      }
    } catch {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(email, password);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-700 text-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
            <Truck strokeWidth={2.5} className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            UPS HERU Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistem Informasi Pengelolaan & Retribusi
          </p>
        </div>

        <div className="bg-white px-6 sm:px-10 py-10 shadow-sm border border-slate-200/60 rounded-2xl">
          {/* Quick Access Driver Mode Terbuka */}
          <div className="mb-6 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/90">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 tracking-tight">
                <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-black uppercase">
                  ⚡ Mode Terbuka
                </span>
                <span>Akses Cepat 1-Ketukan</span>
              </div>
            </div>
            <p className="text-[11px] text-emerald-800 mb-3 leading-relaxed">
              Klik nama supir armada di bawah untuk langsung masuk tanpa perlu mengetik kata sandi:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => performLogin("raka@hero.com", "123456")}
                disabled={loading}
                className="p-2.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-left transition-all active:scale-95 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">🚛 Raka Driver</div>
                  <div className="text-[10px] text-slate-500">Grandmax Astroboy</div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-emerald-700">Masuk Langsung ➔</div>
              </button>
              <button
                type="button"
                onClick={() => performLogin("ago@hero.com", "123456")}
                disabled={loading}
                className="p-2.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-left transition-all active:scale-95 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">🚛 Ago Driver</div>
                  <div className="text-[10px] text-slate-500">Grandmax B 1999</div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-emerald-700">Masuk Langsung ➔</div>
              </button>
              <button
                type="button"
                onClick={() => performLogin("piat@hero.com", "123456")}
                disabled={loading}
                className="p-2.5 rounded-lg bg-white border border-emerald-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-left transition-all active:scale-95 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-xs text-slate-900">🚛 Piat Driver</div>
                  <div className="text-[10px] text-slate-500">Carry Futura B 2000</div>
                </div>
                <div className="mt-2 text-[10px] font-bold text-emerald-700">Masuk Langsung ➔</div>
              </button>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Alamat Email atau No. HP
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                placeholder="nama@hero.com atau 0812xxxx"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Kata Sandi
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
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
            className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-slate-400 group-hover:text-emerald-800 transition-colors" />
            <span>Unduh Aplikasi Mobile</span>
          </NativeGuardedLink>
        </div>
      </div>
    </main>
  );
}
