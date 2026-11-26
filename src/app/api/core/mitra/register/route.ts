import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";

const MitraRegisterSchema = z.object({
  namaLengkap: z.string().trim().min(3, "Nama penanggung jawab minimal 3 karakter."),
  namaInstansi: z.string().trim().min(3, "Nama unit/instansi minimal 3 karakter."),
  jenisUsaha: z.string().trim().default("tps3r"),
  noWhatsapp: z.string().trim().refine((val) => {
    const digits = val.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, "Nomor WhatsApp tidak valid (minimal 10 digit, format 08xx atau 628xx)."),
  email: z.string().trim().email("Format email resmi tidak valid.").toLowerCase(),
  kota: z.string().trim().min(2, "Kota/kabupaten wilayah kerja minimal 2 karakter.").default("Kota Depok"),
  estimasiWarga: z.coerce.number().min(0).default(100),
  kebutuhanDb: z.enum(["shared", "dedicated"]).default("shared"),
  catatanAdmin: z.string().trim().optional().nullable(),
  website_hp: z.string().optional().nullable(), // Honeypot anti-bot
});

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  // Rate Limiting internal: maks 5 permintaan per jam per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `mitra-register-internal:${ip}`;
  if (!(await allowAttempt(key, { max: 5, windowMs: 60 * 60 * 1000 }))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak permintaan pendaftaran. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { ...corsHeaders, "Retry-After": String(retry) } }
    );
  }

  try {
    const rawBody = await request.json();
    const parseResult = MitraRegisterSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || "Input tidak valid.";
      return NextResponse.json(
        { error: firstError, details: parseResult.error.format() },
        { status: 400, headers: corsHeaders }
      );
    }

    const {
      namaLengkap,
      namaInstansi,
      jenisUsaha,
      noWhatsapp,
      email,
      kota,
      estimasiWarga,
      kebutuhanDb,
      catatanAdmin,
      website_hp,
    } = parseResult.data;

    // Honeypot trap: jika field terisi, bot sedang menyerang form -> respon sukses palsu tanpa simpan ke DB
    if (website_hp && website_hp.trim().length > 0) {
      return NextResponse.json(
        {
          success: true,
          message: "Pendaftaran kemitraan berhasil dikirim! Tim O2W Hero akan segera menghubungi Anda.",
          data: { id: 0, instansi: namaInstansi, status: "menunggu_review" },
        },
        { status: 201, headers: corsHeaders }
      );
    }

    // Normalisasi format nomor WhatsApp (08xx -> 628xx)
    let cleanPhone = noWhatsapp.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }

    // Simpan pendaftaran mitra baru ke database core
    const pendaftaran = await prisma.mitraRegistration.create({
      data: {
        namaLengkap,
        namaInstansi,
        jenisUsaha,
        noWhatsapp: cleanPhone,
        email,
        kota,
        estimasiWarga,
        kebutuhanDb,
        catatanAdmin: catatanAdmin || null,
        status: "menunggu_review",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Pendaftaran kemitraan pengelola sampah berhasil dikirim! Tim O2W Hero akan segera menghubungi Anda melalui WhatsApp.",
        data: {
          id: pendaftaran.id,
          instansi: pendaftaran.namaInstansi,
          status: pendaftaran.status,
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Core API] Error registrasi mitra:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses pendaftaran mitra." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Hanya Superadmin yang dapat melihat daftar pendaftaran mitra." },
        { status: 403, headers: corsHeaders }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { namaInstansi: { contains: search, mode: "insensitive" } },
        { namaLengkap: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { noWhatsapp: { contains: search } },
        { kota: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.mitraRegistration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          tenant: {
            select: {
              id: true,
              slug: true,
              namaMitra: true,
              status: true,
              subdomain: true,
              customDomain: true,
            },
          },
        },
      }),
      prisma.mitraRegistration.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Core API] Error get registrasi mitra:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pendaftaran mitra." },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PATCH(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }
    if (session.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden: Hanya Superadmin yang dapat memverifikasi pendaftaran mitra." },
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { id, status, catatanAdmin } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID pendaftaran dan status baru wajib disediakan." },
        { status: 400, headers: corsHeaders }
      );
    }

    const registration = await prisma.mitraRegistration.findUnique({
      where: { id: Number(id) },
    });

    if (!registration) {
      return NextResponse.json(
        { error: "Data pendaftaran mitra tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Jika status disetujui dan tenant belum dibuat -> Jalankan Auto-Provisioning Atomic
    if (status === "disetujui" && !registration.tenantId) {
      let baseSlug = registration.namaInstansi
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!baseSlug || baseSlug.length < 3) baseSlug = `mitra-${registration.id}`;

      let finalSlug = baseSlug;
      let counter = 1;
      while (await prisma.tenant.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      const tenantId = `tenant-${finalSlug}`;
      const subdomain = `${finalSlug}.o2whero.com`;
      // Precomputed bcrypt hash cost 12 untuk "Hero2026!"
      const defaultPasswordHash = "$2b$12$3ztQ.y84FdNIeOqw7dDfPOXgJ2r.6mVtzUOFMWb63ns8aPSdOLeiK";

      const txResult = await prisma.$transaction(async (tx) => {
        // 1. Buat Tenant Baru
        const newTenant = await tx.tenant.create({
          data: {
            id: tenantId,
            slug: finalSlug,
            namaMitra: registration.namaInstansi,
            penanggungJawab: registration.namaLengkap,
            noTelepon: registration.noWhatsapp,
            email: registration.email,
            kota: registration.kota,
            tipePengelola: registration.jenisUsaha,
            status: "aktif",
            paketLangganan: "starter",
            subdomain: subdomain,
            customDomain: null,
            warnaTema: "#0284c7",
            fiturAktif: JSON.stringify([
              "dashboard",
              "pelanggan",
              "tagihan",
              "bayar",
              "pengangkutan",
              "petugas",
              "kendaraan",
              "laporan",
            ]),
            catatan: catatanAdmin ? String(catatanAdmin).trim() : "Otomatis di-provisioning via pendaftaran mitra.",
          },
        });

        // 2. Buat TenantDomain Utama
        await tx.tenantDomain.create({
          data: {
            tenantId: newTenant.id,
            domain: subdomain,
            isPrimary: true,
            isVerified: true,
            sslStatus: "active",
          },
        });

        // 3. Buat atau Kaitkan Akun User Admin
        let adminUser = await tx.user.findUnique({
          where: { email: registration.email },
        });

        if (!adminUser) {
          adminUser = await tx.user.create({
            data: {
              email: registration.email,
              password: defaultPasswordHash,
              nama: registration.namaLengkap,
              role: "admin",
              noTelepon: registration.noWhatsapp,
              aktif: true,
              tenantId: newTenant.id,
              tokenVersion: 1,
            },
          });
        } else {
          await tx.user.update({
            where: { id: adminUser.id },
            data: {
              tenantId: newTenant.id,
              role: adminUser.role === "superadmin" ? "superadmin" : "admin",
            },
          });
        }

        // 4. Kaitkan TenantMembership
        await tx.tenantMembership.upsert({
          where: {
            userId_tenantId: {
              userId: adminUser.id,
              tenantId: newTenant.id,
            },
          },
          create: {
            userId: adminUser.id,
            tenantId: newTenant.id,
            role: "admin",
            aktif: true,
          },
          update: {
            role: "admin",
            aktif: true,
          },
        });

        // 5. Buat TenantSubscription
        await tx.tenantSubscription.create({
          data: {
            tenantId: newTenant.id,
            planName: "starter",
            status: "aktif",
            billingCycle: "monthly",
            pricePerMonth: 349000,
            domainSetupFee: 0,
            setupFeePaid: true,
            autoRenew: true,
          },
        });

        // 6. Update Status Pendaftaran Mitra
        const updatedReg = await tx.mitraRegistration.update({
          where: { id: registration.id },
          data: {
            status: "disetujui",
            tenantId: newTenant.id,
            catatanAdmin: catatanAdmin ? String(catatanAdmin).trim() : "Pendaftaran disetujui & unit otomatis aktif.",
          },
        });

        // 7. Catat AuditLog
        await tx.auditLog.create({
          data: {
            aksi: "APPROVE_MITRA_REGISTRATION",
            entitas: "MitraRegistration",
            entitasId: registration.id,
            dataBaru: JSON.stringify({ tenantId: newTenant.id, slug: finalSlug, subdomain }),
            userId: session.id,
            tenantId: newTenant.id,
          },
        });

        return { tenant: newTenant, subdomain, adminUser, updatedReg };
      });

      // 8. Daftarkan ke Dynamic In-Memory Cache
      try {
        const { registerDynamicTenant } = await import("@/lib/tenant/config");
        registerDynamicTenant({
          id: txResult.tenant.id,
          slug: txResult.tenant.slug,
          namaMitra: txResult.tenant.namaMitra,
          tipe: "mitra_mandiri",
          domains: [txResult.subdomain],
          primaryDomain: txResult.subdomain,
          branding: {
            namaMitra: txResult.tenant.namaMitra,
            tagline: `Unit Pengelolaan Sampah ${txResult.tenant.namaMitra}`,
            kota: txResult.tenant.kota || "Indonesia",
            warnaTema: txResult.tenant.warnaTema || "#0284c7",
            emailKontak: txResult.tenant.email || "",
            whatsappKontak: txResult.tenant.noTelepon || "",
          },
          dbConfig: { isDedicated: false },
          status: "aktif",
          fitur: {
            retribusiSampah: true,
            tabunganSampah: true,
            jemputSampah: true,
            jualOfftaker: true,
            qrisDuitku: true,
            whatsappNotif: true,
          },
        });
      } catch (cacheErr) {
        console.warn("Dynamic tenant cache update warning:", cacheErr);
      }

      return NextResponse.json(
        {
          success: true,
          message: `Pendaftaran disetujui! Tenant ${txResult.tenant.namaMitra} berhasil dibuat dengan subdomain ${txResult.subdomain}.`,
          data: {
            registration: txResult.updatedReg,
            tenant: txResult.tenant,
            subdomain: txResult.subdomain,
            loginUrl: `https://${txResult.subdomain}/login`,
            initialAdminEmail: txResult.adminUser.email,
            defaultPasswordNote: "Password awal: Hero2026! (Harap segera ubah password saat login pertama).",
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // Jika perubahan status biasa (misal: "ditolak", "menunggu_review")
    const updated = await prisma.mitraRegistration.update({
      where: { id: Number(id) },
      data: {
        status: String(status),
        ...(catatanAdmin !== undefined ? { catatanAdmin: String(catatanAdmin) } : {}),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Status pendaftaran mitra berhasil diubah menjadi ${status}.`,
        data: updated,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Core API] Error update registrasi mitra:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status registrasi mitra." },
      { status: 500, headers: corsHeaders }
    );
  }
}
