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
    <div className="min-h-screen bg-[#f4f4f0] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center space-y-4">
          <div className="inline-block px-4 py-1 border-2 border-black font-bold uppercase text-xs mb-2 bg-black text-white">
            O2W / LOGIN ADMIN
          </div>
          <h2 className="text-5xl font-black uppercase tracking-tighter">
            MASUK <span className="text-red-600">SISTEM.</span>
          </h2>
          <p className="font-bold uppercase tracking-widest text-xs">
            HANYA UNTUK STAF DAN PETUGAS.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="hm-card bg-white p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold uppercase tracking-widest mb-2"
              >
                ALAMAT EMAIL <span className="text-red-600">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#f4f4f0] hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
                  placeholder="admin@o2whero.com"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-widest mb-2"
              >
                KATA SANDI <span className="text-red-600">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f4f4f0] hm-border px-4 py-3 text-black text-sm font-bold outline-none focus:ring-4 focus:ring-red-500/20 uppercase"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 border-2 font-bold uppercase text-sm bg-red-50 border-red-600 text-red-600 text-center">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="hm-btn-red w-full mt-4"
              >
                {loading ? "MEMVERIFIKASI DATA..." : "MASUK SISTEM"}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/unduh"
            className="inline-block hm-border bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
          >
            📱 Unduh App Android (O₂W Lapangan)
          </Link>
        </div>
        <div className="mt-8 text-center text-xs font-bold uppercase tracking-widest text-black">
          <p>O2W HERO DEPOK © {new Date().getFullYear()}</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full border border-black animate-pulse" /> SISTEM ONLINE
          </div>
        </div>
      </div>
    </div>
  );
}
