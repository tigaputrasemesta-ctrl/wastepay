import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { JWT_SECRET, COOKIE_NAME } from "@/lib/secret";
import { extractOrigin, isSameOriginRequest } from "@/lib/csrf";
import { ROLE_HIERARCHY, type Role } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

// Role hierarchy — single source of truth di src/lib/rbac.ts
// (ROLE_HIERARCHY diimpor agar tidak ada dua definisi yang bisa divergen).

// Page access by minimum role level
const PAGE_ROLES: Record<string, number> = {
  "/dashboard": 20, // kasir+
  "/registrasi": 50, // admin+
  "/survei": 10, // petugas survei (calon → aktif + foto/geo tag)
  "/kendaraan": 50, // admin: kendaraan & titik transit
  "/sticker": 20, // kasir+: cetak sticker nomor pelanggan
  "/pelanggan": 20, // kasir+
  "/peta": 10, // semua role
  "/tagihan": 10, // semua role
  "/petugas": 50, // admin+
  "/rute": 50, // admin+
  "/jadwal": 10, // semua role
  "/pengangkutan": 10, // semua role
  "/komplain": 10, // semua role
  "/absensi": 10, // petugas: absen masuk/selesai
  "/klaim": 10, // petugas: klaim tunjangan
  "/manajemen-tarif": 50, // admin+: kelola tarif & paket
  "/transit": 50, // admin+: kelola titik transit (petugas melihat via peta, bukan halaman ini)
  "/pengeluaran": 50, // admin+
  "/laporan": 20, // kasir+
  "/pengumuman": 50, // admin+
  "/pengaturan": 50, // admin+
  "/notifikasi": 20, // kasir+
  "/rekonsiliasi": 50, // admin+
  "/tpa": 50, // admin+
  "/chat": 50, // admin+: chat petugas ↔ admin
  "/users": 100, // superadmin only
  "/audit-log": 100, // superadmin only
};

// API routes that require specific roles.
// Key yang diakhiri "/" berlaku untuk semua sub-path (mis. /api/pelanggan/5).
// Route yang tidak terdaftar di sini akan ditolak (fail-closed).
const API_ROLE_MAP: Record<string, number> = {
  // Auth & public (diizinkan di proxy, dicek di handler masing-masing)
  // /api/auth/* dan /api/publik/* — lihat whitelist di bawah

  // Users (superadmin only — GET dibuka untuk admin agar bisa link akun petugas)
  "GET:/api/users": 50,
  "POST:/api/users": 100,
  "PUT:/api/users": 100,
  "DELETE:/api/users": 100,

  // Audit log (superadmin only)
  "GET:/api/audit-log": 100,

  // Absensi — petugas absen masuk/selesai, admin lihat semua
  "GET:/api/absensi": 10,
  "POST:/api/absensi": 10,

  // Klaim petugas — petugas ajukan, admin/superadmin proses (PUT)
  "GET:/api/klaim": 10,
  "POST:/api/klaim": 10,
  "PUT:/api/klaim": 50,

  // Auth seed (superadmin only) — DI LUAR /api/auth agar tidak kena bypass proxy
  "POST:/api/seed/admin": 100,

  // Duitku status (admin+)
  "GET:/api/duitku/status": 50,

  // Pelanggan — PUT dibuka utk petugas survei (guard jabatan di handler)
  "GET:/api/pelanggan": 10,
  "GET:/api/pelanggan/": 10,
  "POST:/api/pelanggan": 50,
  "PUT:/api/pelanggan/": 10,
  "DELETE:/api/pelanggan/": 50,

  // Survei petugas — detail pendaftar (read-only, tanpa data keuangan)
  "GET:/api/survei/": 10,

  // Petugas
  "GET:/api/petugas": 10,
  "GET:/api/petugas/": 10,
  "POST:/api/petugas": 50,
  "PUT:/api/petugas/": 50,
  "DELETE:/api/petugas/": 50,

  // Lokasi realtime petugas (petugas kirim posisi, semua lihat di peta)
  "GET:/api/petugas/lokasi": 10,
  "POST:/api/petugas/lokasi": 10,
  "GET:/api/petugas/me": 10,

  // Kendaraan (dump truck / pickup) — pengemudi kirim lokasi, semua lihat
  "GET:/api/kendaraan": 10,
  "GET:/api/kendaraan/": 10,
  "POST:/api/kendaraan": 50,
  "PUT:/api/kendaraan/": 50,
  "DELETE:/api/kendaraan/": 50,
  "GET:/api/kendaraan/lokasi": 10,
  "POST:/api/kendaraan/lokasi": 10,

  // Titik transit (lapak)
  "GET:/api/transit": 10,
  "POST:/api/transit": 50,
  "PUT:/api/transit": 50,
  "DELETE:/api/transit": 50,
  "GET:/api/transit/": 10,
  "PUT:/api/transit/": 50,
  "DELETE:/api/transit/": 50,

  // Rute
  "GET:/api/rute": 10,
  "GET:/api/rute/": 10,
  "POST:/api/rute": 50,
  "PUT:/api/rute/": 50,
  "DELETE:/api/rute/": 50,

  // Jadwal
  "GET:/api/jadwal": 10,
  "POST:/api/jadwal": 50,
  "PUT:/api/jadwal/": 50,
  "DELETE:/api/jadwal/": 50,

  // Pengangkutan — petugas di lapangan boleh mencatat/update pengangkutan
  "GET:/api/pengangkutan": 10,
  "POST:/api/pengangkutan": 10,
  "PUT:/api/pengangkutan/": 10,
  "DELETE:/api/pengangkutan/": 50,

  // Lapor angkut cepat (input kode pelanggan) — petugas lapangan
  "GET:/api/pengangkutan/lapor": 10,
  "POST:/api/pengangkutan/lapor": 10,

  // Chat petugas ↔ admin
  "GET:/api/chat": 10,
  "POST:/api/chat": 10,
  "POST:/api/chat/read": 10,

  // Komplain
  "GET:/api/komplain": 10,
  "POST:/api/komplain": 10,
  "PUT:/api/komplain/": 20,
  "DELETE:/api/komplain/": 50,

  // Tagihan
  "GET:/api/tagihan": 10,
  "POST:/api/tagihan": 50,
  "PUT:/api/tagihan/": 50,
  "DELETE:/api/tagihan/": 50,
  // Denda juga ditambahkan ke daftar API_ROLE_MAP
  "POST:/api/tagihan/generate": 50,
  "POST:/api/tagihan/tunggakan": 50,

  // Pembayaran — kasir boleh mencatat, verifikasi/reset hanya admin+
  // Pembayaran — petugas tagih boleh mencatat & memverifikasi (guard jabatan di handler)
  "GET:/api/pembayaran": 10,
  "POST:/api/pembayaran": 10,
  "PUT:/api/pembayaran/": 10,
  "DELETE:/api/pembayaran/": 50,

  // Pengeluaran
  "GET:/api/pengeluaran": 50,
  "POST:/api/pengeluaran": 50,
  "PUT:/api/pengeluaran/": 50,
  "DELETE:/api/pengeluaran/": 50,

  // Pengumuman
  "GET:/api/pengumuman": 10,
  "POST:/api/pengumuman": 50,
  "PUT:/api/pengumuman/": 50,
  "DELETE:/api/pengumuman/": 50,

  // Notifikasi
  "GET:/api/notifikasi": 20,
  "POST:/api/notifikasi": 20,
  "DELETE:/api/notifikasi/": 50,

  // Laporan & ekspor CSV
  "GET:/api/laporan/": 20,

  // Rekonsiliasi
  "GET:/api/rekonsiliasi": 50,
  "POST:/api/rekonsiliasi": 50,
  "DELETE:/api/rekonsiliasi/": 100,

  // TPA
  "GET:/api/tpa": 10,
  "POST:/api/tpa": 50,
  "PUT:/api/tpa/": 50,
  "DELETE:/api/tpa/": 50,

  // Wilayah
  "GET:/api/wilayah": 10,
  "GET:/api/wilayah/": 10,
  "POST:/api/wilayah": 50,
  "PUT:/api/wilayah/": 50,
  "DELETE:/api/wilayah/": 50,

  // Kelurahan — dropdown scope petugas & referensi wilayah/zona
  "GET:/api/kelurahan": 10,

  // Zona angkut — pembagian area pengambilan sampah per kelurahan
  "GET:/api/zona": 10,
  "GET:/api/zona/": 10,
  "POST:/api/zona": 50,
  "PUT:/api/zona/": 50,
  "DELETE:/api/zona/": 50,

  // Kategori tarif & paket
  "GET:/api/kategori-tarif": 10,
  "POST:/api/kategori-tarif": 50,
  "PUT:/api/kategori-tarif/": 50,
  "DELETE:/api/kategori-tarif/": 50,
  "GET:/api/paket": 10,
  "POST:/api/paket": 50,
  "PUT:/api/paket/": 50,
  "DELETE:/api/paket/": 50,
  "POST:/api/paket/seed": 100,
};

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as {
      id: number;
      email: string;
      nama: string;
      role: string;
      v?: number;
    };
  } catch {
    return null;
  }
}

/**
 * Muat user dari DB untuk cek revoke (tokenVersion) & status aktif.
 * Sesi JWT lama (sebelum ganti/reset password) atau user yang dinonaktifkan ditolak.
 * Jika DB sedang transien/lambat, fallback ke payload JWT yang terverifikasi kriptografis.
 */
async function loadSessionUser(payload: { id: number; email?: string; nama?: string; role?: string; v?: number }) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        tokenVersion: true,
        aktif: true,
      },
    });
    if (user) {
      if (!user.aktif) return null;
      if (payload.v !== undefined && user.tokenVersion !== payload.v) return null;
      return { id: user.id, email: user.email, nama: user.nama, role: user.role };
    }
  } catch {
    // DB lookup transient error
  }
  
  if (payload.id && payload.email && payload.role) {
    return { id: payload.id, email: payload.email, nama: payload.nama || "", role: payload.role };
  }
  return null;
}

function getRoleLevel(role: string): number {
  return ROLE_HIERARCHY[role as Role] ?? 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Halaman publik
  // /peta/tv dilindungi token TV (env TV_VIEW_TOKEN) di dalam page-nya sendiri,
  // bukan lewat sesi login — biarkan lolos proxy agar browser kiosk bisa akses.
  if (pathname === "/login" || pathname === "/bayar" || pathname.toLowerCase() === "/peta/tv") {
    return NextResponse.next();
  }

  // Auth API & publik API — dicek di handler masing-masing
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/publik")) {
    return NextResponse.next();
  }

  // ---- CSRF: proteksi request mutasi pada API ber-cookie ----
  // API publik & auth di-skip: stateless (tanpa sesi), bukan target CSRF.
  const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (MUTATING_METHODS.has(request.method) && pathname.startsWith("/api")) {
    const allowedOrigins = [new URL(request.url).origin];
    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (envAppUrl) {
      const envOrigin = extractOrigin(envAppUrl);
      if (envOrigin) allowedOrigins.push(envOrigin);
    }
    const ok = isSameOriginRequest(
      request.headers.get("origin"),
      request.headers.get("referer"),
      allowedOrigins
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Forbidden: asal permintaan tidak dikenali" },
        { status: 403 }
      );
    }
  }

  // ---- Halaman invoice publik: anti-enumerasi ----
  // noInvoice berformat INV/{kodePelanggan}/{YYYYMM} (kode pelanggan sequential),
  // jadi halaman ini bisa di-scrape massal. Rate limit per IP — halaman sah
  // (via QR scan) tetap bisa dibuka, enumerator terhambat.
  if (pathname === "/invoice-tagihan") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const key = `invoice-page:${ip}`;
    if (!(await allowAttempt(key, { max: 60, windowMs: 15 * 60 * 1000 }))) {
      const retry = retryAfterSeconds(key);
      return new NextResponse(
        `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.`,
        { status: 429, headers: { "Retry-After": String(retry) } }
      );
    }
  }

  const token = request.cookies.get(COOKIE_NAME)?.value || request.cookies.get("__Host-session")?.value || request.cookies.get("session")?.value;
  const payload = token ? await verifyToken(token) : null;

  // ---- API Routes ----
  if (pathname.startsWith("/api")) {
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cek revoke/aktif di DB — token lama (ganti password) & user nonaktif ditolak
    const user = await loadSessionUser(payload);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = `${request.method}:${pathname}`;
    let requiredLevel = API_ROLE_MAP[apiKey];

    // Fallback: prefix match untuk route /[id]
    if (!requiredLevel) {
      for (const [key, level] of Object.entries(API_ROLE_MAP)) {
        if (key.endsWith("/") && apiKey.startsWith(key)) {
          requiredLevel = level;
          break;
        }
      }
    }

    // Fail-closed: route API yang tidak terdaftar ditolak
    if (!requiredLevel) {
      return NextResponse.json(
        { error: "Forbidden: rute tidak terdaftar" },
        { status: 403 }
      );
    }

    if (getRoleLevel(user.role) < requiredLevel) {
      return NextResponse.json(
        { error: "Forbidden: Anda tidak memiliki akses ke fitur ini" },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // ---- Page Routes ----
  if (!payload) {
    const isAdminPage = Object.keys(PAGE_ROLES).some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    );

    if (isAdminPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  }

  // User dengan cookie ada — cek revoke/aktif juga untuk halaman
  // (sesi lama setelah ganti password diarahkan ke login).
  const pageUser = await loadSessionUser(payload);
  if (!pageUser) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "sesi");
    return NextResponse.redirect(url);
  }

  // Check page-specific role requirements
  for (const [pagePrefix, minLevel] of Object.entries(PAGE_ROLES)) {
    if (pathname === pagePrefix || pathname.startsWith(pagePrefix + "/")) {
      if (getRoleLevel(pageUser.role) < minLevel) {
        const fallbackPath = pageUser.role === "petugas" ? "/peta" : "/dashboard";
        const url = new URL(fallbackPath, request.url);
        url.searchParams.set("error", "akses");
        return NextResponse.redirect(url);
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/).*)"],
};
