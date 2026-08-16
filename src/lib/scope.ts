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

/**
 * Upsert kelurahan dari nama string (normalisasi trim).
 * Dipakai saat create/update Wilayah supaya `Wilayah.kelurahanId` selalu sinkron
 * dengan kolom denormalisasi `Wilayah.kelurahan`.
 */
export async function upsertKelurahan(
  nama?: string | null,
  kecamatan?: string | null,
  kota?: string | null
): Promise<number | null> {
  const namaBersih = (nama ?? "").trim();
  if (!namaBersih) return null;

  const existing = await prisma.kelurahan.findFirst({
    where: { nama: { equals: namaBersih, mode: "insensitive" } },
    select: { id: true, kecamatan: true, kota: true },
  });

  if (existing) {
    // Isi metadata bila sebelumnya kosong (jangan timpa data yang sudah ada)
    const patch: { kecamatan?: string; kota?: string } = {};
    if (!existing.kecamatan && kecamatan?.trim()) patch.kecamatan = kecamatan.trim();
    if (!existing.kota && kota?.trim()) patch.kota = kota.trim();
    if (Object.keys(patch).length > 0) {
      await prisma.kelurahan.update({ where: { id: existing.id }, data: patch });
    }
    return existing.id;
  }

  const created = await prisma.kelurahan.create({
    data: {
      nama: namaBersih,
      kecamatan: kecamatan?.trim() || null,
      kota: kota?.trim() || null,
    },
  });
  return created.id;
}
