/**
 * Utility untuk tindakan cepat driver/petugas lapangan (ala Gojek/Grab Driver):
 * - Buka WhatsApp dengan template ramah
 * - Buka Navigasi Google Maps turn-by-turn
 * - Dial nomor telepon langsung
 */

export function cleanIndoPhone(rawPhone?: string | null): string | null {
  if (!rawPhone) return null;
  const cleaned = rawPhone.replace(/\D/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("08")) {
    return "628" + cleaned.slice(2);
  }
  if (cleaned.startsWith("8")) {
    return "628" + cleaned.slice(1);
  }
  if (cleaned.startsWith("62")) {
    return cleaned;
  }
  return cleaned;
}

export function buildWhatsAppDriverUrl({
  phone,
  nama,
  alamat,
  patokan,
  isMenunggak,
}: {
  phone?: string | null;
  nama: string;
  alamat: string;
  patokan?: string | null;
  isMenunggak?: boolean;
}): string | null {
  const cleanPhone = cleanIndoPhone(phone);
  if (!cleanPhone) return null;

  let message = "";
  if (isMenunggak) {
    message = `Halo Bpk/Ibu ${nama}, saya petugas kebersihan WastePay. Saat ini jadwal pengangkutan di alamat (${alamat}${
      patokan ? " - " + patokan : ""
    }), namun ada info tunggakan iuran retribusi di sistem kami. Mohon kesediaannya untuk konfirmasi atau penyelesaian tagihan. Terima kasih 🙏`;
  } else {
    message = `Halo Bpk/Ibu ${nama}, saya petugas kebersihan WastePay saat ini sudah tiba di depan rumah (${alamat}${
      patokan ? " - " + patokan : ""
    }). Mohon dibukakan pagar atau tempat sampah ditaruh di luar ya. Terima kasih banyak 🙏`;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function buildCallUrl(phone?: string | null): string | null {
  const cleanPhone = cleanIndoPhone(phone);
  if (!cleanPhone) return null;
  return `tel:+${cleanPhone}`;
}
