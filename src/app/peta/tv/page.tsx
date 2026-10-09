import { prisma } from "@/lib/prisma";
import { tvTokenValid } from "@/lib/tv-token";
import TvMap from "@/components/TvMap";
import type { PelangganPeta } from "@/components/PetaMap";

export const metadata = {
  title: "Peta TV | UPS HERU",
  description: "Peta operasional fullscreen untuk layar besar / TV",
};

export const dynamic = "force-dynamic";

/**
 * /peta/tv?t=TV_VIEW_TOKEN
 *
 * Mode layar besar (TV / wallboard). Tanpa sidebar admin, fullscreen, dan
 * read-only. Akses dilindungi token `t` (env TV_VIEW_TOKEN) — tanpa sesi
 * login, cocok untuk browser kiosk yang tidak bisa menyimpan cookie login.
 */
export default async function PetaTvPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  if (!tvTokenValid(t)) {
    return (
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="text-center px-8">
          <p className="font-extrabold uppercase tracking-widest text-white text-2xl">
            Akses Ditolak
          </p>
          <p className="font-mono text-sm text-white/50 mt-3 uppercase tracking-wider">
            Token layar TV tidak valid / tidak disertakan
          </p>
          <p className="font-mono text-xs text-white/40 mt-6">
            Gunakan: <span className="text-emerald-400">/peta/tv?t=TOKEN</span>
          </p>
        </div>
      </div>
    );
  }

  // Data statis (pelanggan berkoordinat) diambil server-side sekali; data
  // realtime (petugas/kendaraan/lapak/pengaduan) di-polling oleh TvMap.
  const pelanggan = await prisma.pelanggan.findMany({
    where: { deletedAt: null, latitude: { not: null }, longitude: { not: null } },
    select: {
      id: true,
      nama: true,
      kodePelanggan: true,
      alamat: true,
      fotoRumah: true,
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
  });

  const pelangganPeta: PelangganPeta[] = pelanggan.map((p) => ({
    ...p,
    statusTagihan: null,
  }));

  return <TvMap pelanggan={pelangganPeta} token={t!} />;
}
