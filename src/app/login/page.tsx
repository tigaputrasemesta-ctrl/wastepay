"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Truck, LogIn, Smartphone, ShieldCheck, Loader2 } from "lucide-react";

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
        
        if (safeNext) {
          router.push(safeNext);
        } else if (data.user?.role === "petugas") {
          router.push("/m");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-700 text-white rounded-lg flex items-center justify-center mb-4 shadow-sm">
            <Truck strokeWidth={2.5} className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            WastePay Portal
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sistem Informasi Pengelolaan & Retribusi
          </p>
        </div>

        <div className="bg-white px-6 sm:px-10 py-10 shadow-sm border border-slate-200/60 rounded-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Alamat Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 text-sm outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
                placeholder="nama@upsheru.com"
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
          <Link
            href="/unduh"
            className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-emerald-700 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-slate-400 group-hover:text-emerald-800 transition-colors" />
            <span>Unduh Aplikasi Mobile</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
