import { prisma } from "@/lib/prisma";

/**
 * SEMENTARA (1 perusahaan): semua petugas boleh akses & approve SEMUA kelurahan.
 * Ubah jadi `false` untuk mengaktifkan kembali pembatasan scope per kelurahan.
 * Pembatasan jabatan (survei/tagih/angkut) TETAP berlaku — ini hanya scope geografis.
 */
export const PETUGAS_SCOPE_ALL = true;

/**
 * Resolve scope kelurahan petugas yang sedang login.
 *
 * Hirarki scope petugas lapangan:
 *  1. `Petugas.kelurahanId` eksplisit → scope approval SELURUH kelurahan
 *     (semua RT/wilayah di bawah kelurahan itu).
 *  2. Fallback: kelurahan dari `Petugas.wilayahId` (RT yang ditugaskan).
 *
 * Admin/superadmin/kasir TIDAK memakai fungsi ini — mereka bypass (scope semua).
 * Return `null` bila akun tidak ter-link ke profil petugas atau tanpa kelurahan.
 */
export async function getPetugasKelurahan(userId: number): Promise<number | null> {
  const profil = await prisma.petugas.findUnique({
    where: { userId },
    select: {
      kelurahanId: true,
      wilayah: { select: { kelurahanId: true } },
    },
  });
  if (!profil) return null;
  return profil.kelurahanId ?? profil.wilayah?.kelurahanId ?? null;
}
