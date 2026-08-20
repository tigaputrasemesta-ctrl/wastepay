import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tvTokenValid } from "@/lib/tv-token";
import { getSession } from "@/lib/auth";
import { ROLE_HIERARCHY, type Role } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Dianggap "online" bila kirim posisi < 15 menit lalu.
const ONLINE_MS = 15 * 60 * 1000;

function startOfTodayJakarta(): Date {
  const now = new Date();
  const jkt = new Date(now.getTime() + 7 * 3600 * 1000);
  return new Date(
    Date.UTC(jkt.getUTCFullYear(), jkt.getUTCMonth(), jkt.getUTCDate()) - 7 * 3600 * 1000
  );
}

type Item = {
  id: string;
  tipe: string;
  waktu: string;
  judul: string;
  detail: string;
  aktor?: string;
};

const ANGKUT_LABEL: Record<string, string> = {
  terjadwal: "Jadwal angkut dibuat",
  diambil: "Sampah diangkut",
  tidak_diangkut: "Tidak diangkut",
  kosong: "Rumah kosong",
};

const KOMPLAIN_JENIS: Record<string, string> = {
  tidak_diangkut: "Tidak diangkut",
  sampah_menumpuk: "Sampah menumpuk",
  lainnya: "Lainnya",
};

const KOMPLAIN_STATUS: Record<string, string> = {
  baru: "baru",
  diproses: "diproses",
  selesai: "selesai",
};

const METODE_LABEL: Record<string, string> = {
  transfer: "Transfer",
  ewallet: "E-Wallet",
  qris: "QRIS",
  virtual_account: "VA",
  tunai: "Tunai",
  duitku: "Duitku",
};

const KLAIM_LABEL: Record<string, string> = {
  bbm: "BBM",
  perawatan: "Perawatan",
  gaji_petugas: "Gaji",
  lainnya: "Lainnya",
};

const PENGELUARAN_LABEL: Record<string, string> = {
  bbm: "BBM",
  gaji_petugas: "Gaji petugas",
  perawatan: "Perawatan",
  operasional: "Operasional",
  lainnya: "Lainnya",
};

const AUDIT_AKSI: Record<string, string> = {
  create: "Buat",
  update: "Ubah",
  delete: "Hapus",
};

const NOTIF_STATUS: Record<string, string> = {
  pending: "antre",
  terkirim: "terkirim",
  gagal: "gagal",
};

function trunc(s: string, n = 70): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/**
 * GET /api/publik/live-report?t=TV_VIEW_TOKEN
 *
 * Laporan aktivitas gabungan (real-time) untuk layar besar / dashboard:
 * pengangkutan, komplain, absensi, pembayaran, klaim, pengeluaran,
 * pengumuman, aksi admin (audit), dan notifikasi — plus statistik ringkas.
 *
 * Auth: token TV `t` (kiosk) ATAU sesi admin/kasir (cookie) — tanpa keduanya
 * ditolak 401. Data scope admin (seluruh wilayah), cocok untuk wallboard.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t") || request.headers.get("x-tv-token");

  let allowed = tvTokenValid(token);
  if (!allowed) {
    const session = await getSession();
    const level = session ? ROLE_HIERARCHY[session.role as Role] ?? 0 : 0;
    allowed = level >= 20; // kasir, admin, superadmin
  }
  if (!allowed) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 401 });
  }

  try {
    const hariIni = startOfTodayJakarta();
    const cutoff = new Date(Date.now() - ONLINE_MS);

    const [
      angkut,
      komplain,
      absensi,
      pembayaran,
      klaim,
      pengeluaran,
      pengumuman,
      audit,
      notif,
      onlinePetugas,
      onlineKendaraan,
      angkutHariIni,
      komplainBaru,
      pembayaranHariIni,
      absensiHariIni,
    ] = await Promise.all([
      // ── Alur aktivitas ──
      prisma.pengangkutan.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          status: true,
          volume: true,
          createdAt: true,
          pelanggan: { select: { nama: true } },
          petugas: { select: { nama: true } },
        },
      }),
      prisma.komplain.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          jenis: true,
          status: true,
          deskripsi: true,
          createdAt: true,
          pelanggan: { select: { nama: true } },
        },
      }),
      prisma.absensi.findMany({
        orderBy: { waktuMasuk: "desc" },
        take: 20,
        select: {
          id: true,
          waktuMasuk: true,
          waktuSelesai: true,
          status: true,
          petugas: { select: { nama: true } },
        },
      }),
      prisma.pembayaran.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          jumlah: true,
          metode: true,
          status: true,
          createdAt: true,
          pelanggan: { select: { nama: true } },
        },
      }),
      prisma.klaimPetugas.findMany({
        orderBy: { tanggal: "desc" },
        take: 15,
        select: {
          id: true,
          kategori: true,
          nominal: true,
          status: true,
          tanggal: true,
          petugas: { select: { nama: true } },
        },
      }),
      prisma.pengeluaran.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          kategori: true,
          jumlah: true,
          keterangan: true,
          createdAt: true,
          dicatatBy: { select: { nama: true } },
        },
      }),
      prisma.pengumuman.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          judul: true,
          isi: true,
          createdAt: true,
          createdBy: { select: { nama: true } },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          aksi: true,
          entitas: true,
          entitasId: true,
          createdAt: true,
          user: { select: { nama: true } },
        },
      }),
      prisma.notifikasi.findMany({
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          tipe: true,
          judul: true,
          status: true,
          penerima: true,
          createdAt: true,
        },
      }),

      // ── Statistik ──
      prisma.lokasiPetugas.findMany({
        where: { createdAt: { gte: cutoff }, petugas: { aktif: true } },
        select: { petugasId: true },
        distinct: ["petugasId"],
      }),
      prisma.lokasiKendaraan.findMany({
        where: { createdAt: { gte: cutoff }, kendaraan: { aktif: true } },
        select: { kendaraanId: true },
        distinct: ["kendaraanId"],
      }),
      prisma.pengangkutan.aggregate({
        where: { deletedAt: null, status: "diambil", createdAt: { gte: hariIni } },
        _count: true,
        _sum: { volume: true },
      }),
      prisma.komplain.count({ where: { status: "baru" } }),
      prisma.pembayaran.aggregate({
        where: { status: "terverifikasi", createdAt: { gte: hariIni } },
        _count: true,
        _sum: { jumlah: true },
      }),
      prisma.absensi.count({ where: { waktuMasuk: { gte: hariIni } } }),
    ]);

    const items: Item[] = [];

    for (const a of angkut) {
      items.push({
        id: `angkut-${a.id}`,
        tipe: "angkut",
        waktu: a.createdAt.toISOString(),
        judul: ANGKUT_LABEL[a.status] ?? a.status,
        detail: `${a.pelanggan.nama}${a.petugas?.nama ? ` · ${a.petugas.nama}` : ""}${
          a.volume != null ? ` · ${a.volume} m³` : ""
        }`,
        aktor: a.petugas?.nama ?? undefined,
      });
    }

    for (const k of komplain) {
      items.push({
        id: `komplain-${k.id}`,
        tipe: "komplain",
        waktu: k.createdAt.toISOString(),
        judul: `Komplain ${KOMPLAIN_JENIS[k.jenis] ?? k.jenis}`,
        detail: `${k.pelanggan.nama} · ${KOMPLAIN_STATUS[k.status] ?? k.status} · ${trunc(
          k.deskripsi,
          50
        )}`,
        aktor: k.pelanggan.nama,
      });
    }

    for (const a of absensi) {
      items.push({
        id: `abs-${a.id}-in`,
        tipe: "absensi",
        waktu: a.waktuMasuk.toISOString(),
        judul: "Absensi masuk",
        detail: `${a.petugas.nama} · ${a.status}`,
        aktor: a.petugas.nama,
      });
      if (a.waktuSelesai) {
        items.push({
          id: `abs-${a.id}-out`,
          tipe: "absensi",
          waktu: a.waktuSelesai.toISOString(),
          judul: "Absensi selesai",
          detail: a.petugas.nama,
          aktor: a.petugas.nama,
        });
      }
    }

    for (const p of pembayaran) {
      items.push({
        id: `bayar-${p.id}`,
        tipe: "pembayaran",
        waktu: p.createdAt.toISOString(),
        judul: `Pembayaran ${METODE_LABEL[p.metode] ?? p.metode}`,
        detail: `${p.pelanggan.nama} · Rp ${p.jumlah.toLocaleString("id-ID")} · ${p.status}`,
        aktor: p.pelanggan.nama,
      });
    }

    for (const k of klaim) {
      items.push({
        id: `klaim-${k.id}`,
        tipe: "klaim",
        waktu: k.tanggal.toISOString(),
        judul: `Klaim ${KLAIM_LABEL[k.kategori] ?? k.kategori}`,
        detail: `${k.petugas.nama} · Rp ${k.nominal.toLocaleString("id-ID")} · ${k.status}`,
        aktor: k.petugas.nama,
      });
    }

    for (const p of pengeluaran) {
      items.push({
        id: `keluar-${p.id}`,
        tipe: "pengeluaran",
        waktu: p.createdAt.toISOString(),
        judul: `Pengeluaran ${PENGELUARAN_LABEL[p.kategori] ?? p.kategori}`,
        detail: `Rp ${p.jumlah.toLocaleString("id-ID")}${p.keterangan ? ` · ${trunc(p.keterangan, 40)}` : ""}`,
        aktor: p.dicatatBy?.nama ?? undefined,
      });
    }

    for (const p of pengumuman) {
      items.push({
        id: `info-${p.id}`,
        tipe: "pengumuman",
        waktu: p.createdAt.toISOString(),
        judul: `Pengumuman: ${p.judul}`,
        detail: `${trunc(p.isi, 60)}${p.createdBy?.nama ? ` · oleh ${p.createdBy.nama}` : ""}`,
        aktor: p.createdBy?.nama ?? undefined,
      });
    }

    for (const a of audit) {
      items.push({
        id: `audit-${a.id}`,
        tipe: "audit",
        waktu: a.createdAt.toISOString(),
        judul: `${AUDIT_AKSI[a.aksi] ?? a.aksi} ${a.entitas} #${a.entitasId}`,
        detail: a.user?.nama ? `oleh ${a.user.nama}` : "oleh sistem",
        aktor: a.user?.nama ?? undefined,
      });
    }

    for (const n of notif) {
      items.push({
        id: `notif-${n.id}`,
        tipe: "notifikasi",
        waktu: n.createdAt.toISOString(),
        judul: `Notifikasi ${n.tipe}`,
        detail: `${trunc(n.judul, 40)} · ${n.penerima} · ${NOTIF_STATUS[n.status] ?? n.status}`,
        aktor: undefined,
      });
    }

    items.sort((x, y) => new Date(y.waktu).getTime() - new Date(x.waktu).getTime());

    return NextResponse.json(
      {
        stats: {
          onlinePetugas: onlinePetugas.length,
          onlineKendaraan: onlineKendaraan.length,
          angkutHariIni: angkutHariIni._count,
          volumeHariIni: Math.round((angkutHariIni._sum.volume ?? 0) * 10) / 10,
          komplainBaru,
          pembayaranHariIni: pembayaranHariIni._count,
          nominalPembayaranHariIni: pembayaranHariIni._sum.jumlah ?? 0,
          absensiHariIni,
        },
        aktivitas: items.slice(0, 80),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("live-report error:", err);
    return NextResponse.json({ error: "Gagal memuat laporan" }, { status: 500 });
  }
}
