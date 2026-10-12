import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/calon_pelanggan_model.dart';

class SurveiService {
  /// Ambil daftar calon pelanggan baru untuk disurvei
  static Future<List<CalonPelangganModel>> getCalonList({String? kelurahan}) async {
    String url = ApiEndpoints.survei;
    if (kelurahan != null && kelurahan.isNotEmpty) {
      url += "?kelurahan=${Uri.encodeComponent(kelurahan)}";
    }

    final res = await ApiClient.get(url);
    if (res is List) {
      return res.map((item) => CalonPelangganModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Verifikasi calon pelanggan menjadi aktif dengan foto geotag
  static Future<void> submitSurvei({
    required int id,
    required double latitude,
    required double longitude,
    required String fotoRumahBase64,
    String? patokanLokasi,
    String? kategori,
    String? customTarif,
  }) async {
    final url = ApiEndpoints.surveiDetail(id);
    final body = <String, dynamic>{
      'status': 'aktif',
      'latitude': latitude,
      'longitude': longitude,
      'fotoRumah': fotoRumahBase64,
      'koordinatSumber': 'gps_perangkat',
      if (patokanLokasi != null) 'patokanLokasi': patokanLokasi,
      if (kategori != null) 'kategori': kategori,
      if (customTarif != null) 'customTarif': double.tryParse(customTarif),
    };

    await ApiClient.put(url, body: body);
  }
}
