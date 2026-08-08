import { prisma } from "./prisma";
import { getSession } from "./auth";

type Aksi = "create" | "update" | "delete";

/**
 * Catat aksi ke tabel AuditLog. Dipanggil setelah mutasi berhasil.
 * Data lama/baru disimpan sebagai JSON (dipotong untuk keamanan & ukuran).
 */
export async function logAudit(
  aksi: Aksi,
  entitas: string,
  entitasId: number | string,
  dataLama?: unknown,
  dataBaru?: unknown
): Promise<void> {
  try {
    const session = await getSession();

    await prisma.auditLog.create({
      data: {
        aksi,
        entitas,
        entitasId: Number(entitasId),
        dataLama: dataLama != null ? safeJson(dataLama) : null,
        dataBaru: dataBaru != null ? safeJson(dataBaru) : null,
        userId: session?.id ?? null,
      },
    });
  } catch {
    // Audit log tidak boleh menggagalkan operasi utama
  }
}

function safeJson(data: unknown): string {
  try {
    const json = JSON.stringify(data);
    return json && json.length > 4000 ? `${json.slice(0, 4000)}…` : json ?? "null";
  } catch {
    return String(data);
  }
}
