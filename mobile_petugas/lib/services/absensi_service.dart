import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/absensi_model.dart';

class AbsensiService {
  /// Ambil status absensi hari ini
  static Future<AbsensiModel?> getStatusHariIni() async {
    final res = await ApiClient.get(ApiEndpoints.absensi);
    if (res is Map) {
      if (res['statusHariIniRecord'] != null && res['statusHariIniRecord'] is Map<String, dynamic>) {
        return AbsensiModel.fromJson(res['statusHariIniRecord'] as Map<String, dynamic>);
      }
      if (res['absensi'] is List && (res['absensi'] as List).isNotEmpty) {
        final first = (res['absensi'] as List).first;
        if (first is Map<String, dynamic>) {
          return AbsensiModel.fromJson(first);
        }
      }
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
        'action': tipe, // Backend WastePay expects action: 'masuk' | 'selesai'
        'tipe': tipe,
        'latitude': latitude,
        'longitude': longitude,
        'foto': fotoBase64,
        'catatan': catatan ?? 'Absensi via Aplikasi Android Flutter',
      },
    );

    if (res is Map) {
      if (res['absensi'] != null && res['absensi'] is Map<String, dynamic>) {
        return AbsensiModel.fromJson(res['absensi'] as Map<String, dynamic>);
      } else if (res['data'] != null && res['data'] is Map<String, dynamic>) {
        return AbsensiModel.fromJson(res['data'] as Map<String, dynamic>);
      } else if (res['id'] != null) {
        return AbsensiModel.fromJson(res as Map<String, dynamic>);
      }
    }

    throw ApiException("Berhasil absen, gagal membaca status.");
  }
}
