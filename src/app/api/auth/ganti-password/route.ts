import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { passwordLama, passwordBaru } = await request.json();

    if (!passwordLama || !passwordBaru) {
      return NextResponse.json(
        { error: "Password lama dan baru wajib diisi" },
        { status: 400 }
      );
    }
    if (passwordBaru.length < 8) {
      return NextResponse.json(
        { error: "Password baru minimal 8 karakter" },
        { status: 400 }
      );
    }
    if (passwordLama === passwordBaru) {
      return NextResponse.json(
        { error: "Password baru harus berbeda dari password lama" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });
    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    const valid = await verifyPassword(passwordLama, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Password lama salah" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(passwordBaru) },
    });

    return NextResponse.json({ message: "Password berhasil diganti" });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengganti password" },
      { status: 500 }
    );
  }
}
