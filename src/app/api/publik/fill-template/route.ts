import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const templates = [
    { key: 'WA_TEMPLATE_TAGIHAN_BARU', value: `Yth. Bapak/Ibu [NAMA],

Sistem kami telah menerbitkan invoice untuk tagihan Anda, berikut kami sampaikan rincian tagihan Anda:

ID Pelanggan: [KODE]
Paket: [PAKET]
Periode: [PERIODE]
Total Tagihan: [TOTAL]
Jatuh Tempo: [JATUH_TEMPO]

Anda dapat melakukan pembayaran dan juga melihat detail invoice pdf melalui link berikut:
[LINK]

Demikian informasi ini kami sampaikan. Terima kasih
__
Best Regards,

UPS HERU DEPOK` },
    { key: 'WA_TEMPLATE_TAGIHAN_JATUH_TEMPO', value: `*PENGINGAT TAGIHAN — UPS HERU DEPOK*

Halo [NAMA],
[SISA_HARI] HARI LAGI jatuh tempo tagihan iuran sampah [PERIODE]:

📄 No. Tagihan : [NO_INVOICE]
💰 Total       : [TOTAL]
📅 Jatuh Tempo : [JATUH_TEMPO]

👉 Bayar online: [LINK]
Terima kasih 🙏

— UPS HERU DEPOK` },
    { key: 'WA_TEMPLATE_TUNGGAKAN', value: `*TAGIHAN MENUNGGAK — UPS HERU DEPOK*

Halo [NAMA],
Tagihan iuran sampah [PERIODE] Anda telah melewati jatuh tempo dan dikenakan denda [DENDA].

📄 No. Tagihan : [NO_INVOICE]
💰 Total       : [TOTAL]

👉 Segera bayar: [LINK]
Agar layanan pengangkutan sampah tetap berjalan tanpa kendala.

— UPS HERU DEPOK` },
    { key: 'WA_TEMPLATE_PEMBAYARAN_DITERIMA', value: `*PEMBAYARAN DITERIMA ✅*

Halo [NAMA],
Pembayaran tagihan iuran sampah [PERIODE] sebesar [TOTAL] telah kami terima via [METODE].

📄 No. Tagihan : [NO_INVOICE]
🔍 Lihat bukti : [LINK]

Terima kasih! 🙏

— UPS HERU DEPOK` },
    { key: 'WA_TEMPLATE_PEMBAYARAN_GAGAL', value: `*TRANSAKSI BELUM SELESAI ⏳*

Halo [NAMA],
Transaksi pembayaran tagihan [PERIODE] ([NO_INVOICE]) sebesar [TOTAL] gagal atau kadaluarsa.

Silakan ulangi pembayaran: [LINK]

— UPS HERU DEPOK` },
    { key: 'WA_TEMPLATE_PENDAFTARAN_DITERIMA', value: `*PENDAFTARAN DITERIMA ✅*

Halo [NAMA],
Terima kasih, data pendaftaran Anda sudah kami terima dan sedang menunggu konfirmasi pengelola.

🆔 Kode Pelanggan: [KODE]

Anda akan dihubungi jika pendaftaran disetujui.

— UPS HERU DEPOK` },
    { key: 'WA_TEMPLATE_PENDAFTARAN_DISETUJUI', value: `*PENDAFTARAN DISETUJUI ✅*

Halo [NAMA],
Selamat! Pendaftaran berlangganan Anda telah disetujui.

🆔 Kode Pelanggan: [KODE]

Anda dapat menggunakan nomor WhatsApp Anda atau kode pelanggan untuk mengecek tagihan dan jadwal penjemputan di website kami.
Terima kasih telah bergabung.

— UPS HERU DEPOK` }
  ];

  try {
    let result: string[] = [];
    for (const t of templates) {
      await prisma.pengaturan.upsert({
        where: { key: t.key },
        update: { value: t.value },
        create: { key: t.key, value: t.value }
      });
      result.push(t.key);
    }
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
