import { getSession } from "@/lib/auth";
import { tvTokenValid } from "@/lib/tv-token";
import { ROLE_HIERARCHY, type Role } from "@/lib/rbac";
import LiveReport from "@/components/LiveReport";

export const metadata = {
  title: "Live Report | O2W",
  description: "Laporan aktivitas realtime untuk layar besar / dashboard",
};

export const dynamic = "force-dynamic";

/**
 * /live?t=TV_VIEW_TOKEN  (kiosk / TV)
 * /live                   (admin/kasir yang sudah login)
 *
 * Fullscreen, read-only, auto-refresh. Akses via token TV ATAU sesi
 * admin/kasir — tanpa keduanya ditolak.
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  const session = await getSession();
  const level = session ? ROLE_HIERARCHY[session.role as Role] ?? 0 : 0;
  const adminOk = level >= 20; // kasir, admin, superadmin
  const tokenOk = tvTokenValid(t);

  if (!tokenOk && !adminOk) {
    return (
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-[#0d0e10]">
        <div className="text-center px-8">
          <p className="font-black uppercase tracking-[0.3em] text-white text-2xl">
            Akses Ditolak
          </p>
          <p className="font-mono text-sm text-white/50 mt-3 uppercase tracking-wider">
            Token layar TV tidak valid / tidak disertakan
          </p>
          <p className="font-mono text-xs text-white/30 mt-6">
            Gunakan: <span className="text-green-400">/live?t=TOKEN</span>
          </p>
        </div>
      </div>
    );
  }

  return <LiveReport token={tokenOk ? t : undefined} />;
}
