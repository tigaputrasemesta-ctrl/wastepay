import { NextResponse } from "next/server";
import { getSession } from "./auth";
import { hasRole, type SessionUser, type Role } from "./rbac";

/**
 * Middleware to require a minimum role for API routes
 * Server-only: uses getSession() which imports next/headers
 */
export async function requireRole(
  request?: Request,
  minRole: Role = "admin"
): Promise<{ user: SessionUser } | NextResponse> {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasRole(user, minRole)) {
    return NextResponse.json(
      { error: "Forbidden: Anda tidak memiliki akses ke fitur ini" },
      { status: 403 }
    );
  }
  return { user };
}
