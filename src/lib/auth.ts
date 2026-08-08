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

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
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

  const token = await createSession(sessionUser);
  return { user: sessionUser, token };
}
