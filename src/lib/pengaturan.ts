import { prisma } from "./prisma";

export async function getPengaturanNumber(key: string, defaultValue: number): Promise<number> {
  try {
    const val = await prisma.pengaturan.findUnique({ where: { key } });
    if (val) return parseFloat(val.value) || defaultValue;
  } catch (e) {
    console.error(e);
  }
  return defaultValue;
}

export async function getPajakDaerahRate(): Promise<number> {
  return getPengaturanNumber("PAJAK_DAERAH_RATE", 0);
}

export async function getDendaKeterlambatanRate(): Promise<number> {
  return getPengaturanNumber("DENDA_KETERLAMBATAN_RATE", 0);
}

export async function setPengaturan(key: string, value: string) {
  return prisma.pengaturan.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
