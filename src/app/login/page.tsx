"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
        // Honor ?next= tujuan awal (mis. dari APK → /m), dengan batas hanya
        // path internal yang diawali "/" (anti open-redirect).
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
      setError("TERJADI KESALAHAN, COBA LAGI");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200/80 flex items-center justify-center mx-auto text-2xl shadow-xs">
          🚛
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Portal Petugas & Admin
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Sistem Informasi Pengelolaan & Retribusi Sampah Kota Depok
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-7 sm:p-9 shadow-sm">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-700"
              >
                Alamat Email Petugas / Admin <span className="text-rose-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                placeholder="nama@upsheru.com"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-700"
              >
                Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 placeholder:font-normal"
                placeholder="Masukkan kata sandi"
              />
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-md active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <span>Masuk ke Sistem 🔐</span>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/unduh"
            className="inline-flex items-center gap-2 bg-white border border-slate-200/80 rounded-full px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <span>📱</span>
            <span>Unduh Aplikasi Android Petugas</span>
          </Link>
        </div>

        <div className="mt-8 text-center text-[11px] text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} WastePay • UPS HERU Kota Depok</p>
          <div className="mt-1.5 flex items-center justify-center gap-1.5 text-emerald-600 font-semibold text-[10px]">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span>SISTEM OPERASIONAL AKTIF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
