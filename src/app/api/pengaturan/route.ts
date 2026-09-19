import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPengaturanNumber, setPengaturan } from "@/lib/pengaturan";

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pajakDaerahRate = await getPengaturanNumber("PAJAK_DAERAH_RATE", 0);
  const dendaKeterlambatanRate = await getPengaturanNumber("DENDA_KETERLAMBATAN_RATE", 0);

  return NextResponse.json({
    PAJAK_DAERAH_RATE: pajakDaerahRate,
    DENDA_KETERLAMBATAN_RATE: dendaKeterlambatanRate,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (typeof body.PAJAK_DAERAH_RATE !== "undefined") {
      await setPengaturan("PAJAK_DAERAH_RATE", String(body.PAJAK_DAERAH_RATE));
    }
    if (typeof body.DENDA_KETERLAMBATAN_RATE !== "undefined") {
      await setPengaturan("DENDA_KETERLAMBATAN_RATE", String(body.DENDA_KETERLAMBATAN_RATE));
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Gagal menyimpan pengaturan" }, { status: 500 });
  }
}
