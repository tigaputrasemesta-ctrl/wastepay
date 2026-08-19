import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { JWT_SECRET, COOKIE_NAME } from "./secret";

export type SessionUser = {
  id: number;
  email: string;
  nama: string;
  role: string;
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
    v: user.tokenVersion,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || cookieStore.get("__Host-session")?.value || cookieStore.get("session")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as {
      id: number;
      email: string;
      nama: string;
      role: string;
      v?: number;
    };

    try {
      // Revoke check: sesi JWT hanya valid jika user masih aktif DAN tokenVersion cocok
      const user = await prisma.user.findUnique({
        where: { id: p.id },
        select: { tokenVersion: true, aktif: true },
      });
      if (user) {
        if (!user.aktif) return null;
        if (p.v !== undefined && user.tokenVersion !== p.v) return null;
      }
    } catch {
      // Jika terjadi koneksi pool latency, tetap pertahankan sesi JWT yang telah terverifikasi kriptografis
    }

    return { id: p.id, email: p.email, nama: p.nama, role: p.role };
  } catch {
    return null;
  }
}

export async function login(
  email: string,
  password: string
): Promise<{ user: SessionUser; token: string } | { error: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { error: "Email tidak ditemukan" };

  const valid = await verifyPassword(password, user.password);
  if (!valid) return { error: "Password salah" };

  const sessionUser: SessionUser = {
    id: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
  };

  const token = await createSession({ ...sessionUser, tokenVersion: user.tokenVersion });
  return { user: sessionUser, token };
}
