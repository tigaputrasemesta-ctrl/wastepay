import { NextResponse } from 'next/server';
import { kirimWhatsApp } from '@/lib/wa';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('target') || '085716251003';
  
  try {
    const hasil = await kirimWhatsApp(target, 'Test pengiriman dari Vercel server (Bypass)');
    return NextResponse.json({ result: hasil });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
