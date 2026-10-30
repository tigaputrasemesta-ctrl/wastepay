import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasRole } from '@/lib/rbac';
import { getKontrolContacts } from '@/lib/data-kontrol-service';

/**
 * GET /api/data-kontrol
 * Mengambil rekap terpadu kontak HP Admin & HP Petugas yang dicocokkan LIVE terhadap database Pelanggan.
 */
export async function GET() {
  const user = await getSession();
  if (!user || !hasRole(user, 'admin')) {
    return NextResponse.json({ error: 'Akses ditolak. Memerlukan hak akses Admin/Superadmin.' }, { status: 403 });
  }

  try {
    const data = await getKontrolContacts();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data-kontrol contacts:', error);
    return NextResponse.json(
      { error: 'Gagal memuat data kontrol kontak', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
