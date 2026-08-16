import { prisma } from "@/lib/prisma";
import PetaMap from "@/components/PetaMap";
import LacakLokasi from "@/components/LacakLokasi";
import type { RutePeta } from "@/components/PetaMap";
import type { KendaraanPeta, PetugasPeta, TransitPeta } from "@/components/MapView";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";
import "./peta.css";

export const metadata = {
  title: "Peta Wilayah | O2W",
  description: "Peta sebaran pelanggan dan cakupan layanan sampah Kota Depok",
};

export const dynamic = "force-dynamic";

export default async function PetaPage() {
  const session = await getSession();

  // ── Scope kelurahan: petugas hanya melihat data kelurahannya sendiri (PII terlindungi) ──
  let scopeKelurahanId: number | null = null;
  let petugasTanpaProfil = false;
  if (session && session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
    scopeKelurahanId = await getPetugasKelurahan(session.id);
    if (!scopeKelurahanId) petugasTanpaProfil = true;
  }
  // Admin/non-petugas → lihat semua; petugas berprofil → hanya kelurahannya;
  // petugas tanpa profil → tidak dapat data apa pun (bukan semua wilayah)
  const scope = scopeKelurahanId
    ? { kelurahanId: scopeKelurahanId }
    : petugasTanpaProfil
      ? { id: -1 }
      : {};

  const [pelangganList, wilayahList, tagihanList, ruteList] = await Promise.all([
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
        wilayah: { select: { id: true, nama: true, kelurahan: true, kecamatan: true } },
      },
      orderBy: { kodePelanggan: "asc" },
    }),
    prisma.wilayah.findMany({
      select: { id: true, nama: true, kelurahan: true, kecamatan: true },
      orderBy: { nama: "asc" },
    }),
    prisma.tagihan.findMany({
      where: scopeKelurahanId
        ? { pelanggan: { kelurahanId: scopeKelurahanId } }
        : petugasTanpaProfil
          ? { id: -1 }
          : {},
      select: { pelangganId: true, status: true, bulan: true, tahun: true },
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

  // Status tagihan terbaru per pelanggan
  const tagihanTerbaru = new Map<number, string>();
  for (const t of tagihanList) {
    if (!tagihanTerbaru.has(t.pelangganId)) tagihanTerbaru.set(t.pelangganId, t.status);
  }

  const data = pelangganList.map((p) => ({
    ...p,
    statusTagihan: tagihanTerbaru.get(p.id) ?? null,
  }));

  const rutePeta: RutePeta[] = ruteList.map((r) => ({
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

  const totalBerkoordinat = data.filter((p) => p.latitude != null && p.longitude != null).length;
  void totalBerkoordinat; // statistik (berguna saat debugging peta) — sengaja dipertahankan

  // ── Lokasi terakhir petugas aktif (data awal peta realtime) ──
  const lokasiRaw = await prisma.lokasiPetugas.findMany({
    where: scopeKelurahanId
      ? { petugas: { kelurahanId: scopeKelurahanId, aktif: true } }
      : petugasTanpaProfil
        ? { id: -1 }
        : undefined,
    select: {
      id: true,
      latitude: true,
      longitude: true,
      akurasi: true,
      sumber: true,
      createdAt: true,
      petugas: { select: { id: true, nama: true, jabatan: true, aktif: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const terakhir = new Map<number, (typeof lokasiRaw)[number]>();
  for (const t of lokasiRaw) {
    if (t.petugas.aktif && !terakhir.has(t.petugas.id)) terakhir.set(t.petugas.id, t);
  }
  const petugasPeta: PetugasPeta[] = [...terakhir.values()].map((t) => ({
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
          : undefined,
      select: {
        latitude: true,
        longitude: true,
        akurasi: true,
        createdAt: true,
        kendaraan: {
          select: { id: true, nama: true, platNomor: true, jenis: true, aktif: true, petugas: { select: { nama: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.titikTransit.findMany({
      select: { id: true, nama: true, alamat: true, latitude: true, longitude: true, aktif: true, catatan: true },
      orderBy: { nama: "asc" },
    }),
  ]);
  const kTerakhir = new Map<number, (typeof kendaraanRaw)[number]>();
  for (const t of kendaraanRaw) {
    if (t.kendaraan.aktif && !kTerakhir.has(t.kendaraan.id)) kTerakhir.set(t.kendaraan.id, t);
  }
  const kendaraanPeta: KendaraanPeta[] = [...kTerakhir.values()].map((t) => ({
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
  const transitPeta: TransitPeta[] = transitList.map((t) => ({
    id: t.id,
    nama: t.nama,
    alamat: t.alamat,
    latitude: t.latitude,
    longitude: t.longitude,
    aktif: t.aktif,
    catatan: t.catatan,
  }));

  // ── Profil petugas yang sedang login (untuk tombol Mulai Lacak GPS) ──
  let profilSaya: { id: number; nama: string; jabatan: string | null; wilayahId: number | null } | null = null;
  let kendaraanSaya: { id: number; nama: string; platNomor: string | null; jenis: string }[] = [];
  if (session && session.role === "petugas") {
    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: { id: true, nama: true, jabatan: true, wilayahId: true },
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

  return (
    <div className="h-full w-full relative">
      {profilSaya && (
        <div className="absolute top-4 right-4 z-[1001]">
          <LacakLokasi profil={profilSaya} kendaraan={kendaraanSaya} />
        </div>
      )}
      <PetaMap pelanggan={data} wilayah={wilayahList} rute={rutePeta} petugasAwal={petugasPeta} kendaraanAwal={kendaraanPeta} transitAwal={transitPeta} />
    </div>
  );
}
