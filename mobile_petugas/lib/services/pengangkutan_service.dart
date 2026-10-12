import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/tugas_model.dart';

class PengangkutanService {
  /// Ambil daftar tugas pengangkutan hari ini
  static Future<List<TugasModel>> getTugasHariIni(String tanggalISO) async {
    final url = "${ApiEndpoints.pengangkutan}?saya=1&tanggal=$tanggalISO";
    final res = await ApiClient.get(url);

    if (res is List) {
      return res.map((item) => TugasModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Update status pengangkutan (1-Tap pickup atau detail pickup)
  static Future<void> updateStatus({
    required int taskId,
    required String status, // "diambil", "tidak_diangkut", "kosong"
    String? catatan,
    double? volume,
    double? berat,
    String? jenisSampah,
    String? fotoBuktiBase64,
    double? latitude,
    double? longitude,
  }) async {
    final url = ApiEndpoints.pengangkutanDetail(taskId);
    final body = <String, dynamic>{
      'status': status,
      if (catatan != null) 'catatan': catatan,
      if (volume != null) 'volume': volume,
      if (berat != null) 'berat': berat,
      if (jenisSampah != null) 'jenisSampah': jenisSampah,
      if (fotoBuktiBase64 != null) 'fotoBukti': fotoBuktiBase64,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    };

    await ApiClient.put(url, body: body);
  }
}
