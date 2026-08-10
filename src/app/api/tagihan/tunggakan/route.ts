import { NextResponse } from "next/server";
import { updateTunggakan } from "@/lib/tagihan";

/** Trigger manual: tandai tagihan lewat jatuh tempo sebagai tunggakan + denda */
export async function POST() {
  try {
    const jumlah = await updateTunggakan({ force: true });
    return NextResponse.json({
      message: `${jumlah} tagihan ditandai tunggakan`,
      updated: jumlah,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui status tunggakan" },
      { status: 500 }
    );
  }
}
