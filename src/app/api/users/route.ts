import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getSession } from "@/lib/auth";
import { hasRole, type Role } from "@/lib/rbac";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || !hasRole(user, "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, nama: true, role: true, noTelepon: true, aktif: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("Users GET error:", e);
    return NextResponse.json({ error: "Gagal memuat data user" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, password, nama, role, noTelepon } = body;

    if (!email || !password || !nama || !role) {
      return NextResponse.json({ error: "Email, password, nama, dan role harus diisi" }, { status: 400 });
    }

    const validRoles: Role[] = ["superadmin", "admin", "kasir", "petugas"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        nama,
        role,
        noTelepon,
      },
      select: { id: true, email: true, nama: true, role: true, noTelepon: true, aktif: true },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        aksi: "create",
        entitas: "User",
        entitasId: newUser.id,
        dataBaru: JSON.stringify(newUser),
        userId: session.id,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, aktif, password } = body;

    if (!id) return NextResponse.json({ error: "ID User diperlukan" }, { status: 400 });

    const updateData: { aktif?: boolean; password?: string; tokenVersion?: { increment: number } } = {};
    if (aktif !== undefined) updateData.aktif = Boolean(aktif);
    if (password) {
      updateData.password = await hashPassword(password);
      // Reset password → revoke semua sesi lama user tersebut.
      updateData.tokenVersion = { increment: 1 };
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nama: true, aktif: true }
    });

    await prisma.auditLog.create({
      data: {
        aksi: "update",
        entitas: "User",
        entitasId: id,
        dataBaru: JSON.stringify(updateData),
        userId: session.id,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate user" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id } = body;

    if (!id) return NextResponse.json({ error: "ID User diperlukan" }, { status: 400 });
    if (id === session.id) return NextResponse.json({ error: "Tidak dapat menghapus diri sendiri" }, { status: 400 });

    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        aksi: "delete",
        entitas: "User",
        entitasId: id,
        userId: session.id,
      },
    });

    return NextResponse.json({ message: "User dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 });
  }
}
