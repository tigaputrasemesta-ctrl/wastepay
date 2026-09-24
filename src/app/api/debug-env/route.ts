import { NextResponse } from 'next/server';

export async function GET() {
  const WA_API_KEY = "yZeWGJymbrnTpub2x5rL";
  const WA_API_URL = "https://api.fonnte.com/send";
  
  try {
    const res = await fetch(WA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': WA_API_KEY
      },
      body: JSON.stringify({ target: '085716251003', message: 'Test from vercel', countryCode: '62' })
    });
    const text = await res.text();
    return NextResponse.json({ status: res.status, body: text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
