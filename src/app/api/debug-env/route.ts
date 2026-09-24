import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.WA_API_KEY || '';
  const url = process.env.WA_API_URL || '';
  return NextResponse.json({
    hasKey: !!key,
    keyPrefix: key.substring(0, 5),
    url: url
  });
}
