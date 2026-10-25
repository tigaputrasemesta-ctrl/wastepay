import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let buffer: Buffer;
    let ext = ".jpg";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (!body.image || typeof body.image !== "string") {
        return NextResponse.json({ error: "Data gambar tidak valid" }, { status: 400 });
      }
      const base64Data = body.image.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Ukuran file terlalu besar (Maks 5MB)" }, { status: 400 });
      }
      ext = path.extname(file.name) || ".jpg";
    }

    const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Abaikan jika direktori sudah ada
    }
    
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    return NextResponse.json({ 
      ok: true,
      url: `/uploads/${filename}` 
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Gagal mengunggah file" }, { status: 500 });
  }
}
