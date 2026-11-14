import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { prisma } from "./prisma";
import { JWT_SECRET, COOKIE_NAME } from "./secret";

export type SessionUser = {
  id: number;
  email: string;
  nama: string;
  role: string;
  tenantId?: string | null;
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser & { tokenVersion: number }): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenantId: user.tenantId ?? null,
    v: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function createMobileSession(user: SessionUser & { tokenVersion: number }): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenantId: user.tenantId ?? null,
    v: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(JWT_SECRET);

  return token;
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    if (!Number.isInteger(payload.id) || Number(payload.id) <= 0 || !Number.isInteger(payload.v)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      select: { id: true, email: true, nama: true, role: true, tenantId: true, tokenVersion: true, aktif: true },
    });
    if (!user || !user.aktif || user.tokenVersion !== payload.v) return null;

    const res: SessionUser = {
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
    };
    if (user.tenantId || payload.tenantId) {
      res.tenantId = user.tenantId || (payload.tenantId as string);
    }
    return res;
  } catch {
    return null;
  }
}

export async function getSession(request?: Request): Promise<SessionUser | null> {
  try {
    let token: string | undefined;
    if (request) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
      if (!token) {
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const match = cookieHeader.match(/(?:^|;\s*)(?:session|__Host-session)\s*=\s*([^;]+)/);
          if (match) token = match[1];
        }
      }
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get("__Host-session")?.value || cookieStore.get("session")?.value;
      } catch {
        // cookies() might be unavailable
      }
    }
    if (!token) {
      try {
        const headerStore = await headers();
        const authHeader = headerStore.get("authorization");
        if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
          token = authHeader.slice(7).trim();
        }
      } catch {
        // headers() might be unavailable in non-request context
      }
    }
    if (!token) return null;

    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function login(
  identifier: string,
  password: string
): Promise<{ user: SessionUser; token: string } | { error: string }> {
  const cleanId = identifier.trim();
  const digits = cleanId.replace(/\D/g, "");

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: cleanId, mode: "insensitive" } },
        ...(digits.length >= 8
          ? [
              { noTelepon: { contains: digits } },
              { petugasProfiles: { some: { noTelepon: { contains: digits } } } },
            ]
          : []),
      ],
    },
  });
  if (!user || !user.aktif) return { error: "Email/No. HP atau password salah" };

  const valid = await verifyPassword(password, user.password);
  if (!valid) return { error: "Email/No. HP atau password salah" };

  const tenantId = user.tenantId || (user.role === "superadmin" ? "tenant-core-o2w" : "tenant-pilot-upsheru");
  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    tenantId,
  };

  const token = await createSession({ ...sessionUser, tokenVersion: user.tokenVersion });
  return { user: sessionUser, token };
}
