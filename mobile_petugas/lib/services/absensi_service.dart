import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/absensi_model.dart';

class AbsensiService {
  /// Ambil status absensi hari ini
  static Future<AbsensiModel?> getStatusHariIni() async {
    final res = await ApiClient.get(ApiEndpoints.absensi);
    if (res is Map && res['statusHariIni'] != null) {
      return AbsensiModel.fromJson(res['statusHariIni'] as Map<String, dynamic>);
    }
    return null;
  }

  /// Kirim absen (masuk atau selesai)
  static Future<AbsensiModel> kirimAbsen({
    required String tipe, // "masuk" atau "selesai"
    required double latitude,
    required double longitude,
    required String fotoBase64,
    String? catatan,
  }) async {
    final res = await ApiClient.post(
      ApiEndpoints.absensi,
      body: {
        'tipe': tipe,
        'latitude': latitude,
        'longitude': longitude,
        'foto': fotoBase64,
        'catatan': catatan ?? 'Absensi via Aplikasi Android Flutter',
      },
    );

    if (res is Map && res['data'] != null) {
      return AbsensiModel.fromJson(res['data'] as Map<String, dynamic>);
    } else if (res is Map && res['id'] != null) {
      return AbsensiModel.fromJson(res as Map<String, dynamic>);
    }

    throw ApiException("Berhasil absen, gagal membaca status.");
  }
}
