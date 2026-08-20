export type Role = "superadmin" | "admin" | "kasir" | "petugas";

export const ROLE_HIERARCHY: Record<Role, number> = {
  superadmin: 100,
  admin: 50,
  kasir: 20,
  petugas: 10,
};

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  kasir: "Kasir",
  petugas: "Petugas Lapangan",
};

export type SessionUser = {
  id: number;
  email: string;
  nama: string;
  role: string;
};

/**
 * Check if user has sufficient role level
 */
export function hasRole(user: SessionUser, minRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole];
  return userLevel >= requiredLevel;
}

/**
 * Get allowed menu items based on role
 */
export function getAllowedMenus(role: string): string[] {
  const allMenus = [
    "dashboard",
    "live-report",
    "daftar",
    "survei",
    "pelanggan",
    "peta",
    "zona",
    "tarif",
    "tagihan",
    "petugas",
    "rute",
    "jadwal",
    "pengangkutan",
    "komplain",
    "chat",
    "kendaraan",
    "transit",
    "sticker",
    "pengeluaran",
    "laporan",
    "pengumuman",
    "notifikasi",
    "rekonsiliasi",
    "absensi",
    "klaim",
    "tpa",
    "pengaturan",
  ];

  if (role === "superadmin") return [...allMenus, "users", "audit-log"];
  if (role === "admin") return allMenus;
  if (role === "kasir") return ["dashboard", "peta", "tagihan", "laporan", "notifikasi"];
  if (role === "petugas")
    return ["peta", "survei", "pengangkutan", "tagihan", "jadwal", "komplain", "absensi", "klaim"];

  return [];
}
