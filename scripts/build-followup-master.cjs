const fs = require('fs');
const path = require('path');

const cleanEnrichedPath = 'C:/Users/o2w/.gemini/antigravity-cli/brain/02c0a6c5-53db-4754-bf29-27d344164ffa/scratch/clean_enriched_data.json';
const rawCustomers = JSON.parse(fs.readFileSync(cleanEnrichedPath, 'utf8'));

console.log('Total input customers:', rawCustomers.length);

function getCategoryCode(klasifikasi = '') {
  if (klasifikasi.includes('CENTANG 1')) return 'centang1';
  if (klasifikasi.includes('Tidak Ada Chat')) return 'belum_chat';
  if (klasifikasi.includes('DIBACA tapi TIDAK DIRESPON')) return 'ghosting';
  if (klasifikasi.includes('TERKIRIM (Belum Dibaca)')) return 'centang2_abu';
  return 'ada_respon';
}

function getCategoryBadge(code) {
  switch (code) {
    case 'centang1':
      return { label: 'Centang 1 (Tidak Aktif/Salah)', color: '#ef4444', icon: '🔴', priority: 1 };
    case 'belum_chat':
      return { label: 'Belum Ada Chat', color: '#f97316', icon: '🟠', priority: 2 };
    case 'ghosting':
      return { label: 'Centang Biru (Ghosting)', color: '#3b82f6', icon: '🔵', priority: 3 };
    case 'centang2_abu':
      return { label: 'Centang 2 Abu (Belum Dibuka)', color: '#64748b', icon: '⚪', priority: 4 };
    case 'ada_respon':
    default:
      return { label: 'Ada Respon / Janji Bayar', color: '#10b981', icon: '🟢', priority: 5 };
  }
}

function buildWaMessage(nama, rawPhone, nominal, zona, code, statusJanji) {
  let clean = (rawPhone || '').replace(/\D/g, '');
  if (clean.startsWith('0')) clean = clean.slice(1);
  const displayPhone = '0' + clean;
  const invoiceNo = `INV/${displayPhone}/202611`;
  const invoiceUrl = `https://upsheru.com/bayar-tagihan?invoice=${encodeURIComponent(invoiceNo)}`;

  if (code === 'centang1') {
    return `Selamat siang Bapak/Ibu ${nama}, salam dari UPS HERU Kota Depok 🙏

Kami mengonfirmasi terkait status layanan dan iuran kebersihan periode November 2026 sebesar Rp ${nominal.toLocaleString('id-ID')}.
Mohon bantuan untuk konfirmasi nomor aktif Bapak/Ibu atau info jika nomor ini sudah berganti.

Tautan tagihan resmi:
👉 ${invoiceUrl}

Terima kasih atas kerja samanya. 🙏✨
— Unit Pengelolaan Kebersihan (UPS HERU)`;
  }

  if (code === 'belum_chat') {
    return `🌿 *Pengingat Iuran Kebersihan — UPS HERU*

Yth. Bapak/Ibu Warga *${nama}*,

Semoga Bapak/Ibu dan keluarga senantiasa sehat.

Kami menginformasikan bahwa tagihan iuran pengangkutan sampah UPS HERU periode *November 2026* saat ini belum tercatat:

📄 *No. Tagihan* : ${invoiceNo}
💰 *Total*       : Rp ${nominal.toLocaleString('id-ID')}
📌 *Wilayah*     : ${zona}

Pembayaran dapat dilakukan secara praktis via QRIS (semua Bank & E-Wallet) melalui tautan resmi berikut:
👉 ${invoiceUrl}

*(Scan QRIS langsung otomatis terverifikasi lunas tanpa perlu konfirmasi manual)*

💡 *Kendala Layanan atau Mau Bayar Tunai?*
Silakan langsung balas pesan WhatsApp ini agar kami bantu.

Terima kasih banyak atas kerja sama Bapak/Ibu dalam menjaga kebersihan lingkungan bersama. 🙏✨
—
*Unit Pengelolaan Kebersihan (UPS HERU)*
🌐 www.upsheru.com`;
  }

  if (code === 'ghosting') {
    return `Selamat siang Kak *${nama}*, salam dari UPS HERU Kota Depok 🙏

Kami follow-up kembali untuk iuran pengangkutan sampah periode *November 2026* sebesar *Rp ${nominal.toLocaleString('id-ID')}* (${invoiceNo}).

Di pencatatan kami tagihan ini belum terkonfirmasi lunas. Apabila Kakak sudah melakukan pembayaran (baik tunai kepada petugas keliling atau transfer), mohon bantuannya untuk membalas chat ini ya Kak agar data kami perbarui.

👉 Tautan Invoice QRIS: ${invoiceUrl}

Terima kasih banyak atas perhatian dan kerja samanya Kak ${nama}! 🙏✨
— Pengelola UPS HERU`;
  }

  if (code === 'centang2_abu') {
    return `🌿 *Pengingat Iuran Kebersihan — UPS HERU*

Yth. Bapak/Ibu Warga *${nama}*,

Kami menginformasikan tagihan iuran kebersihan periode *November 2026* sebesar *Rp ${nominal.toLocaleString('id-ID')}* saat ini belum tercatat lunas.

Pembayaran dapat dilakukan via QRIS melalui tautan berikut:
👉 ${invoiceUrl}

*(Abaikan pesan ini apabila sudah membayar ke petugas lapangan)*. Terima kasih 🙏
— UPS HERU`;
  }

  // Ada Respon / Janji Bayar
  return `Halo Kak *${nama}*, salam dari UPS HERU 🙏

Kami follow-up kembali terkait iuran pengangkutan sampah periode *November 2026* sebesar *Rp ${nominal.toLocaleString('id-ID')}*.

Status pencatatan sebelumnya: *${statusJanji || 'Janji Bayar'}*.
Apakah pembayarannya sudah siap diambil petugas keliling kami atau ingin bayar via QRIS otomatis di:
👉 ${invoiceUrl}

Terima kasih atas kerja samanya Kak ${nama}! 🙏✨`;
}

const formatted = rawCustomers.map((c, i) => {
  let rawPhone = c['No. Pelanggan'] || '';
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
  const waPhone = '62' + cleanPhone;
  const displayPhone = '0' + cleanPhone;
  const invoiceNo = `INV/${displayPhone}/202611`;
  const invoiceUrl = `https://upsheru.com/bayar-tagihan?invoice=${encodeURIComponent(invoiceNo)}`;

  const catCode = getCategoryCode(c['Klasifikasi WA']);
  const catBadge = getCategoryBadge(catCode);
  const msgText = buildWaMessage(c['Nama Pelanggan'], rawPhone, c['Nominal (Rp)'], c['Zona'], catCode, c['Status Janji Bayar & Waktu']);

  return {
    id: i + 1,
    nama: c['Nama Pelanggan'],
    phone: displayPhone,
    waPhone: waPhone,
    rawPhone: rawPhone,
    zona: c['Zona'],
    nominal: c['Nominal (Rp)'],
    statusTagihan: c['Status Tagihan'] || 'Tunggakan',
    catCode: catCode,
    catLabel: catBadge.label,
    catColor: catBadge.color,
    catIcon: catBadge.icon,
    priority: catBadge.priority,
    statusCentang: c['Status Centang Terakhir'] || '-',
    totalKirim: c['Total Pesan Terkirim'] || 0,
    totalRespon: c['Total Respon Pelanggan'] || 0,
    kendala: c['Kendala Utama Pelanggan'] || '-',
    statusJanji: c['Status Janji Bayar & Waktu'] || '-',
    ringkasanChat: c['Ringkasan Chat Terakhir'] || '-',
    waktuKirimTerakhir: c['Waktu Pesan Terakhir Dikirim'] || '-',
    waktuResponTerakhir: c['Waktu Respon Terakhir Pelanggan'] || '-',
    pesanTerakhir: c['Pesan Terakhir Pelanggan'] || '-',
    rekomendasi: c['Rekomendasi Tindak Lanjut Petugas'] || '-',
    alamat: c['alamat'] || '-',
    patokan: c['patokan'] || '-',
    lat: c['lat'],
    lng: c['lng'],
    gmapsUrl: c['gmapsUrl'] || `https://www.google.com/maps?q=${c['lat']},${c['lng']}`,
    invoiceNo: invoiceNo,
    invoiceUrl: invoiceUrl,
    messageText: msgText,
    waUrl: 'https://wa.me/' + waPhone + '?text=' + encodeURIComponent(msgText),
    tetangga: (c['rekomendasiTetangga'] || []).map(t => {
      const tClean = (t.noHp || '').replace(/\D/g, '');
      const tWa = tClean.startsWith('0') ? '62' + tClean.slice(1) : tClean;
      const tMsg = `Halo ${t.nama}, maaf mengganggu waktunya sebentar. Kami dari pengelola UPS HERU ingin konfirmasi nomor kontak tetangga Anda, Bapak/Ibu ${c['Nama Pelanggan']} di ${c['Zona']}. Apakah ada nomor kontak terbaru beliau yang aktif? Terima kasih banyak sebelumnya. 🙏`;
      return {
        nama: t.nama,
        noHp: t.noHp,
        waPhone: tWa,
        jarakMeter: t.jarakMeter,
        alamat: t.alamat,
        waUrl: 'https://wa.me/' + tWa + '?text=' + encodeURIComponent(tMsg)
      };
    })
  };
});

// Urutkan berdasarkan prioritas masalah: Centang 1, Belum Chat, Ghosting, Centang 2 Abu, Ada Respon
formatted.sort((a, b) => a.priority - b.priority || a.zona.localeCompare(b.zona));

// Re-assign ID urut
formatted.forEach((c, idx) => { c.displayId = idx + 1; });

const outPath1 = path.join(__dirname, '..', 'data', 'followup_197_master.json');
fs.writeFileSync(outPath1, JSON.stringify(formatted, null, 2), 'utf8');
console.log('Saved master dataset to:', outPath1, 'Total:', formatted.length);
