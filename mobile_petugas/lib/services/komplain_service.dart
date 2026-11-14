import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/komplain_model.dart';

class KomplainService {
  /// Mengambil daftar keluhan / pengaduan warga
  static Future<List<KomplainModel>> getKomplainList({String status = 'semua'}) async {
    final url = status == 'semua'
        ? ApiEndpoints.komplain
        : "${ApiEndpoints.komplain}?status=$status";

    final res = await ApiClient.get(url);
    if (res is List) {
      return res.map((item) => KomplainModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Memperbarui status penanganan komplain (proses, selesai, ditolak)
  static Future<void> updateStatus(
    int komplainId, {
    required String status,
    String? tanggapan,
  }) async {
    final url = "${ApiEndpoints.komplain}/$komplainId";
    final body = <String, dynamic>{
      'status': status,
      if (tanggapan != null && tanggapan.isNotEmpty) 'tanggapan': tanggapan,
    };

    await ApiClient.put(url, body: body);
  }
}
