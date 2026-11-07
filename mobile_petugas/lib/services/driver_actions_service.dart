import 'package:url_launcher/url_launcher.dart';

class DriverActionsService {
  /// Format nomor telepon standar Indonesia (08xx -> 628xx)
  static String? cleanIndoPhone(String? rawPhone) {
    if (rawPhone == null || rawPhone.isEmpty) return null;
    final cleaned = rawPhone.replaceAll(RegExp(r'\D'), '');
    if (cleaned.isEmpty) return null;

    if (cleaned.startsWith('08')) {
      return '628${cleaned.substring(2)}';
    }
    if (cleaned.startsWith('8')) {
      return '628${cleaned.substring(1)}';
    }
    if (cleaned.startsWith('62')) {
      return cleaned;
    }
    return cleaned;
  }

  /// Buka WhatsApp dengan template pesan ramah ala UPS HERU
  static Future<bool> openWhatsApp({
    required String? phone,
    required String nama,
    required String alamat,
    String? patokan,
    bool isMenunggak = false,
  }) async {
    final cleanPhone = cleanIndoPhone(phone);
    if (cleanPhone == null) return false;

    String message;
    if (isMenunggak) {
      message = "Halo Bpk/Ibu $nama, saya petugas kebersihan UPS HERU. "
          "Saat ini jadwal pengangkutan di alamat ($alamat${patokan != null && patokan.isNotEmpty ? " - $patokan" : ""}), "
          "namun ada catatan tunggakan iuran di sistem. Mohon konfirmasi atau penyelesaiannya ya. Terima kasih banyak 🙏";
    } else {
      message = "Halo Bpk/Ibu $nama, saya petugas armada UPS HERU sudah tiba di depan rumah "
          "($alamat${patokan != null && patokan.isNotEmpty ? " - $patokan" : ""}). "
          "Mohon dibukakan pagar atau sampah ditaruh di luar ya. Terima kasih banyak 🙏";
    }

    final url = Uri.parse("https://wa.me/$cleanPhone?text=${Uri.encodeComponent(message)}");
    try {
      return await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  /// Panggil nomor telepon langsung
  static Future<bool> makePhoneCall(String? rawPhone) async {
    final cleanPhone = cleanIndoPhone(rawPhone);
    if (cleanPhone == null) return false;

    final url = Uri.parse("tel:+$cleanPhone");
    try {
      return await launchUrl(url);
    } catch (_) {
      return false;
    }
  }

  /// Buka WhatsApp dengan pesan kustom instan (Template Grab/Gojek)
  static Future<bool> openCustomWhatsApp({
    required String? phone,
    required String message,
  }) async {
    final cleanPhone = cleanIndoPhone(phone);
    if (cleanPhone == null) return false;

    final url = Uri.parse("https://wa.me/$cleanPhone?text=${Uri.encodeComponent(message)}");
    try {
      return await launchUrl(url, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }
}
