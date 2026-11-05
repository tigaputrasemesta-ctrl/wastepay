import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/secret";

export async function POST(request: Request) {
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https://");

  const response = NextResponse.json({ message: "Logout berhasil" });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
