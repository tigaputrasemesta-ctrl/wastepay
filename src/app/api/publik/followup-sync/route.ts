import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const UPDATE_FILE = path.join(process.cwd(), 'data', 'followup_updates.json');
const VALID_PINS = ['2026', '7788'];

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-followup-pin',
  };
}

function isAuthorizedPin(request: Request, bodyPin?: string | null) {
  const url = new URL(request.url);
  const headerPin = request.headers.get('x-followup-pin');
  const queryPin = url.searchParams.get('pin');
  return (
    VALID_PINS.includes(headerPin || '') ||
    VALID_PINS.includes(queryPin || '') ||
    VALID_PINS.includes(bodyPin || '')
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(request: Request) {
  if (!isAuthorizedPin(request)) {
    return NextResponse.json(
      { success: false, error: 'Akses Ditolak: PIN Otorisasi Dibutuhkan' },
      { status: 401, headers: getCorsHeaders() }
    );
  }

  try {
    let data = {};
    if (fs.existsSync(UPDATE_FILE)) {
      data = JSON.parse(fs.readFileSync(UPDATE_FILE, 'utf8'));
    }
    return NextResponse.json(
      { success: true, updates: data, count: Object.keys(data).length },
      { headers: getCorsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!isAuthorizedPin(request, body.pin)) {
      return NextResponse.json(
        { success: false, error: 'Akses Ditolak: PIN Otorisasi Dibutuhkan' },
        { status: 401, headers: getCorsHeaders() }
      );
    }

    const newUpdates = body.updates || {};

    let existing = {};
    if (fs.existsSync(UPDATE_FILE)) {
      try {
        existing = JSON.parse(fs.readFileSync(UPDATE_FILE, 'utf8'));
      } catch (e) {
        existing = {};
      }
    }

    const merged = { ...existing, ...newUpdates };
    fs.mkdirSync(path.dirname(UPDATE_FILE), { recursive: true });
    fs.writeFileSync(UPDATE_FILE, JSON.stringify(merged, null, 2), 'utf8');

    return NextResponse.json(
      {
        success: true,
        message: 'Data berhasil disinkronisasi ke server UPS HERU',
        count: Object.keys(merged).length,
        savedAt: new Date().toISOString(),
      },
      { headers: getCorsHeaders() }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
