import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entitas = searchParams.get("entitas");
  const aksi = searchParams.get("aksi");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

  const where: Record<string, unknown> = {};
  if (entitas) where.entitas = entitas;
  if (aksi) where.aksi = aksi;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, nama: true } },
    },
  });

  return NextResponse.json(logs);
}
