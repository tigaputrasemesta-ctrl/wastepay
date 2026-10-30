import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasRole } from '@/lib/rbac';
import { sendBlastWaWithRouting } from '@/lib/data-kontrol-service';

/**
 * POST /api/data-kontrol/blast
 * Melakukan pengiriman blast WhatsApp ke calon pelanggan dengan routing nomor pengirim masing-masing.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, 'admin')) {
    return NextResponse.json({ error: 'Akses ditolak. Memerlukan hak akses Admin/Superadmin.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { targets, messageTemplate, senderMode, customToken, delayMs, dryRun } = body;

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'Daftar nomor target wajib diisi.' }, { status: 400 });
    }

    if (!messageTemplate || typeof messageTemplate !== 'string' || messageTemplate.trim().length === 0) {
      return NextResponse.json({ error: 'Template pesan tidak boleh kosong.' }, { status: 400 });
    }

    const result = await sendBlastWaWithRouting({
      targets,
      messageTemplate,
      senderMode: senderMode || 'auto',
      customToken,
      delayMs: typeof delayMs === 'number' ? delayMs : 1500,
      dryRun: Boolean(dryRun),
    });

    return NextResponse.json({
      message: `Proses blast selesai: ${result.totalSent} terkirim, ${result.totalSkipped} dilewati, ${result.totalFailed} gagal.`,
      result,
    });
  } catch (error) {
    console.error('Error executing data-kontrol blast:', error);
    return NextResponse.json(
      { error: 'Gagal mengeksekusi blast WhatsApp', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
