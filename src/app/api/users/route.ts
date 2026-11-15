import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getSession } from "@/lib/auth";
import { hasRole, type Role } from "@/lib/rbac";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const user = await getSession();
    if (!user || !hasRole(user, "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope"); // "core" | "mitra" | "operasional" | "all"
    const tenantIdParam = searchParams.get("tenantId");
    const roleParam = searchParams.get("role");
    const searchParam = searchParams.get("search");
    const includeMeta = searchParams.get("meta") === "1";

    const where: Prisma.UserWhereInput = {};

    if (tenantIdParam && tenantIdParam !== "all") {
      where.tenantId = tenantIdParam;
    } else if (scope === "core") {
      // Hanya akun internal platform O2W Hero
      where.OR = [
        { tenantId: "tenant-core-o2w" },
        { role: "superadmin" },
      ];
    } else if (scope === "mitra") {
      // Akun admin & pengelola mitra tenant (bukan core, peran administratif)
      where.AND = [
        { tenantId: { not: "tenant-core-o2w" } },
        { role: { in: ["admin", "kasir"] } },
      ];
    } else if (scope === "operasional") {
      // Staf operasional lapangan / driver / seller mitra
      where.AND = [
        { tenantId: { not: "tenant-core-o2w" } },
        { role: { in: ["petugas", "seller"] } },
      ];
    }

    if (roleParam && roleParam !== "all") {
      where.role = roleParam;
    }

    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      const searchFilter: Prisma.UserWhereInput[] = [
        { nama: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { noTelepon: { contains: q, mode: "insensitive" } },
      ];

      if (where.AND && Array.isArray(where.AND)) {
        where.AND.push({ OR: searchFilter });
      } else if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchFilter }];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        noTelepon: true,
        aktif: true,
        createdAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            namaMitra: true,
            slug: true,
            tipePengelola: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (includeMeta) {
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          namaMitra: true,
          slug: true,
          status: true,
        },
        orderBy: { namaMitra: "asc" },
      });

      return NextResponse.json({
        users,
        tenants,
      });
    }

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
    const { email, password, nama, role, noTelepon, tenantId } = body;

    if (!email || !password || !nama || !role) {
      return NextResponse.json({ error: "Email, password, nama, dan role harus diisi" }, { status: 400 });
    }

    const validRoles: Role[] = ["superadmin", "admin", "kasir", "petugas"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const assignedTenantId = tenantId && String(tenantId).trim() !== ""
      ? String(tenantId).trim()
      : (role === "superadmin" ? "tenant-core-o2w" : "tenant-pilot-upsheru");

    const newUser = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        nama: nama.trim(),
        role,
        noTelepon: noTelepon ? String(noTelepon).trim() : null,
        tenantId: assignedTenantId,
      },
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        noTelepon: true,
        aktif: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            namaMitra: true,
            slug: true,
            tipePengelola: true,
          },
        },
      },
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
  } catch (err: any) {
    console.error("Users POST error:", err);
    return NextResponse.json({ error: err?.message || "Gagal membuat user" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || !hasRole(session, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, aktif, password, nama, email, role, noTelepon, tenantId } = body;

    if (!id) return NextResponse.json({ error: "ID User diperlukan" }, { status: 400 });

    const updateData: {
      aktif?: boolean;
      password?: string;
      tokenVersion?: { increment: number };
      nama?: string;
      email?: string;
      role?: string;
      noTelepon?: string | null;
      tenantId?: string | null;
    } = {};

    if (aktif !== undefined) {
      if (typeof aktif !== "boolean") {
        return NextResponse.json({ error: "Status aktif harus boolean" }, { status: 400 });
      }
      updateData.aktif = aktif;
      updateData.tokenVersion = { increment: 1 };
    }
    if (password) {
      updateData.password = await hashPassword(password);
      updateData.tokenVersion = { increment: 1 };
    }
    if (nama !== undefined) {
      if (!nama.trim()) return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
      updateData.nama = nama.trim();
    }
    if (email !== undefined) {
      const normalized = email.trim().toLowerCase();
      if (!normalized) return NextResponse.json({ error: "Email tidak boleh kosong" }, { status: 400 });
      const existing = await prisma.user.findUnique({ where: { email: normalized } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
      }
      updateData.email = normalized;
    }
    if (role !== undefined) {
      const validRoles: Role[] = ["superadmin", "admin", "kasir", "petugas"];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
      }
      updateData.role = role;
      updateData.tokenVersion = { increment: 1 };
    }
    if (noTelepon !== undefined) updateData.noTelepon = noTelepon.trim() || null;
    if (tenantId !== undefined) {
      updateData.tenantId = tenantId ? String(tenantId).trim() : null;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nama: true,
        role: true,
        noTelepon: true,
        aktif: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            namaMitra: true,
            slug: true,
            tipePengelola: true,
          },
        },
      },
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
  } catch (err: any) {
    console.error("Users PUT error:", err);
    return NextResponse.json({ error: err?.message || "Gagal mengupdate user" }, { status: 500 });
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
  } catch (err: any) {
    console.error("Users DELETE error:", err);
    return NextResponse.json({ error: err?.message || "Gagal menghapus user" }, { status: 500 });
  }
}
