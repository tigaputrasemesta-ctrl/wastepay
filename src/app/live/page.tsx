import { getSession } from "@/lib/auth";
import { tvTokenValid } from "@/lib/tv-token";
import { ROLE_HIERARCHY, type Role } from "@/lib/rbac";
import LiveReport from "@/components/LiveReport";

export const metadata = {
  title: "Live Report | UPS HERU",
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
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-slate-950">
        <div className="text-center px-8">
          <p className="font-extrabold uppercase tracking-widest text-white text-2xl">
            Akses Ditolak
          </p>
          <p className="text-sm font-medium text-white/60 mt-3">
            Token layar TV tidak valid atau tidak disertakan
          </p>
          <p className="text-xs text-white/40 mt-6 font-medium">
            Gunakan: <code className="font-mono text-emerald-400 bg-white/5 px-2 py-1 rounded-lg">/live?t=TOKEN</code>
          </p>
        </div>
      </div>
    );
  }

  return <LiveReport token={tokenOk ? t : undefined} />;
}
