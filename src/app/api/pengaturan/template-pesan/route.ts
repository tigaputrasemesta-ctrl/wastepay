import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const recs = await prisma.pengaturan.findMany({
      where: { key: { startsWith: 'WA_TEMPLATE_' } }
    });
    const map: Record<string, string> = {};
    for (const r of recs) map[r.key] = r.value;
    return NextResponse.json(map);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && key.startsWith('WA_TEMPLATE_')) {
        await prisma.pengaturan.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
