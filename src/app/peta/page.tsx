import { prisma } from "@/lib/prisma";
import PetaMap from "@/components/PetaMap";
import type { PelangganPeta, RutePeta } from "@/components/PetaMap";
import type { KendaraanPeta, PetugasPeta, TransitPeta } from "@/components/MapView";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import { tvTokenValid, getDefaultMapToken } from "@/lib/tv-token";
import PetaTokenGate from "@/components/PetaTokenGate";
import "./peta.css";

export const metadata = {
  title: "Peta Wilayah & Navigasi Lapangan | UPS HERU",
  description: "Peta interaktif seluruh pelanggan dan rute armada kebersihan Kota Depok",
};

export const dynamic = "force-dynamic";

/**
 * Halaman Peta Publik & Lapangan:
 * - Dilindungi oleh Token Akses (seperti Map TV Token) atau Sesi Login Petugas/Admin.
 * - Akses via link ber-token (?token=... atau ?t=...) membuka akses peta KESELURUHAN pelanggan (1.242 titik).
 * - Petugas / admin yang sedang login dapat mengakses langsung sesuai hak aksesnya.
 * - Fullscreen, responsif mobile & desktop, tanpa gangguan sidebar/navbar admin.
 */
export default async function PetaPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string; t?: string; mode?: string; [key: string]: any }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryToken = (resolvedSearchParams.token || resolvedSearchParams.t)?.trim();
  const session = await getSession();
  const isTokenAuth = tvTokenValid(queryToken);

  // Jika pengunjung belum login dan tidak membawa token akses valid
  if (!session && !isTokenAuth) {
    return <PetaTokenGate tokenInvalid={Boolean(queryToken)} />;
  }

  // ── Scope kelurahan jika petugas login dengan profil khusus ──
  // Catatan: Jika membawa token akses valid (link peta keseluruhan), scope kelurahan dilepas
  // agar petugas/lapangan dapat melihat keseluruhan 1.242 pelanggan.
  let scopeKelurahanId: number | null = null;
  let petugasTanpaProfil = false;
  if (!isTokenAuth && session && session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    scopeKelurahanId = await getPetugasKelurahan(session.id);
    if (!scopeKelurahanId) petugasTanpaProfil = true;
  }
  // Pengunjung ber-token / non-scoped / admin → lihat semua titik (1,242 pelanggan);
  // Petugas berprofil spesifik (tanpa token) → hanya kelurahannya;
  // Petugas tanpa profil → tidak dapat data
  const scope = scopeKelurahanId
    ? { kelurahanId: scopeKelurahanId }
    : petugasTanpaProfil
      ? { id: -1 }
      : {};

  let data: PelangganPeta[] = [];
  let rutePeta: RutePeta[] = [];
  let petugasPeta: PetugasPeta[] = [];
  let kendaraanPeta: KendaraanPeta[] = [];
  let transitPeta: TransitPeta[] = [];
  let wilayahList: { id: number; nama: string; kelurahanRef?: { nama: string } | null }[] = [];

  try {
    const [pList, wList, tagihanList, rList] = await Promise.all([
      prisma.pelanggan.findMany({
        where: { deletedAt: null, ...scope },
        select: {
          id: true,
          nama: true,
          kodePelanggan: true,
          alamat: true,
          rtRw: true,
          noTelepon: true,
          status: true,
          kategori: true,
          latitude: true,
          longitude: true,
          patokanLokasi: true,
          wilayah: { select: { id: true, nama: true } },
        },
        orderBy: { kodePelanggan: "asc" },
      }),
      prisma.wilayah.findMany({
        select: { id: true, nama: true, kelurahanRef: { select: { nama: true } } },
        orderBy: { nama: "asc" },
      }),
      prisma.tagihan.findMany({
        where: {
          tahun: { gte: new Date().getFullYear() - 1 },
          ...(scopeKelurahanId
            ? { pelanggan: { kelurahanId: scopeKelurahanId } }
            : petugasTanpaProfil
              ? { id: -1 }
              : {}),
        },
        select: { pelangganId: true, status: true, bulan: true, tahun: true, jatuhTempo: true, jumlah: true },
        orderBy: [{ tahun: "desc" }, { bulan: "desc" }],
      }),
      prisma.rute.findMany({
        where: scopeKelurahanId
          ? { aktif: true, kelurahanId: scopeKelurahanId }
          : petugasTanpaProfil
            ? { id: -1 }
            : { aktif: true },
        select: {
          id: true,
          nama: true,
          hari: true,
          jam: true,
          petugas: { select: { nama: true } },
          kelurahan: { select: { nama: true } },
          jadwal: {
            select: {
              pelanggan: {
                select: { id: true, nama: true, latitude: true, longitude: true },
              },
            },
          },
        },
      }),
    ]);

    wilayahList = wList;

    // Riwayat Tagihan per pelanggan (Maks 6 bulan terakhir)
    const riwayatMap = new Map<number, { bulan: number; tahun: number; status: string; jatuhTempo: string | null; jumlah: number }[]>();
    for (const t of tagihanList) {
      if (!riwayatMap.has(t.pelangganId)) riwayatMap.set(t.pelangganId, []);
      const riwayat = riwayatMap.get(t.pelangganId)!;
      if (riwayat.length < 6) {
        riwayat.push({ bulan: t.bulan, tahun: t.tahun, status: t.status, jatuhTempo: t.jatuhTempo ? t.jatuhTempo.toISOString() : null, jumlah: t.jumlah });
      }
    }

    data = pList.map((p) => {
      const riwayat = riwayatMap.get(p.id) || [];
      return {
        ...p,
        alamat: p.alamat || "",
        statusTagihan: riwayat.length > 0 ? riwayat[0].status : null,
        riwayatTagihan: riwayat,
      };
    });

    rutePeta = rList.map((r) => ({
      id: r.id,
      nama: r.nama,
      hari: r.hari,
      jam: r.jam,
      petugas: r.petugas?.nama ?? null,
      wilayahNama: r.kelurahan?.nama ?? null,
      anggota: r.jadwal
        .map((j) => j.pelanggan)
        .filter((pl) => pl.latitude != null && pl.longitude != null)
        .map((pl) => ({
          id: pl.id,
          nama: pl.nama,
          latitude: pl.latitude!,
          longitude: pl.longitude!,
        })),
    }));

    // ── Lokasi terakhir petugas aktif (data awal peta realtime) ──
    const lokasiRaw = await prisma.lokasiPetugas.findMany({
      where: scopeKelurahanId
        ? { petugas: { kelurahanId: scopeKelurahanId, aktif: true } }
        : petugasTanpaProfil
          ? { id: -1 }
          : { petugas: { aktif: true } },
      distinct: ["petugasId"],
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        akurasi: true,
        sumber: true,
        createdAt: true,
        petugas: { select: { id: true, nama: true, jabatan: true, aktif: true } },
      },
    });

    petugasPeta = lokasiRaw.map((t) => ({
      petugasId: t.petugas.id,
      nama: t.petugas.nama,
      jabatan: t.petugas.jabatan,
      latitude: t.latitude,
      longitude: t.longitude,
      akurasi: t.akurasi,
      sumber: t.sumber,
      updatedAt: t.createdAt.toISOString(),
    }));

    // ── Kendaraan: lokasi terakhir + titik transit (data awal peta) ──
    const [kendaraanRaw, transitList] = await Promise.all([
      prisma.lokasiKendaraan.findMany({
        where: scopeKelurahanId
          ? { kendaraan: { aktif: true, petugas: { kelurahanId: scopeKelurahanId } } }
          : petugasTanpaProfil
            ? { id: -1 }
            : { kendaraan: { aktif: true } },
        distinct: ["kendaraanId"],
        orderBy: { createdAt: "desc" },
        select: {
          latitude: true,
          longitude: true,
          akurasi: true,
          createdAt: true,
          kendaraan: {
            select: { id: true, nama: true, platNomor: true, jenis: true, aktif: true, petugas: { select: { nama: true } } },
          },
        },
      }),
      prisma.titikTransit.findMany({
        select: { id: true, nama: true, alamat: true, latitude: true, longitude: true, aktif: true, catatan: true },
        orderBy: { nama: "asc" },
      }),
    ]);

    kendaraanPeta = kendaraanRaw.map((t) => ({
      kendaraanId: t.kendaraan.id,
      nama: t.kendaraan.nama,
      platNomor: t.kendaraan.platNomor,
      jenis: t.kendaraan.jenis,
      pengemudi: t.kendaraan.petugas?.nama ?? null,
      latitude: t.latitude,
      longitude: t.longitude,
      akurasi: t.akurasi,
      updatedAt: t.createdAt.toISOString(),
    }));

    transitPeta = transitList.map((t) => ({
      id: t.id,
      nama: t.nama,
      alamat: t.alamat,
      latitude: t.latitude,
      longitude: t.longitude,
      aktif: t.aktif,
      catatan: t.catatan,
    }));
  } catch (err) {
    console.error("PetaPage data fetch error:", err);
  }

  // ── Profil petugas yang sedang login (untuk tombol Mulai Lacak GPS) ──
  let profilSaya: { id: number; nama: string; jabatan: string | null } | null = null;
  let kendaraanSaya: { id: number; nama: string; platNomor: string | null; jenis: string }[] = [];
  if (session && session.role === "petugas") {
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true, nama: true, jabatan: true },
    });
    profilSaya = profil ?? null;
    if (profil) {
      const ks = await prisma.kendaraan.findMany({
        where: { petugasId: profil.id, deletedAt: null, aktif: true },
        select: { id: true, nama: true, platNomor: true, jenis: true },
        orderBy: { nama: "asc" },
      });
      kendaraanSaya = ks;
    }
  }

  const activeToken = queryToken || (session ? getDefaultMapToken() : null);

  return (
    <div className="w-screen h-[100dvh] overflow-hidden relative bg-slate-900">
      <PetaMap
        pelanggan={data}
        wilayah={wilayahList}
        rute={rutePeta}
        petugasAwal={petugasPeta}
        kendaraanAwal={kendaraanPeta}
        transitAwal={transitPeta}
        profilSaya={profilSaya}
        kendaraanSaya={kendaraanSaya}
        token={activeToken}
      />
    </div>
  );
}
