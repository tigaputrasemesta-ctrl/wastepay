import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/rute_model.dart';

class RuteService {
  /// Mengambil semua daftar rute operasional
  static Future<List<RuteModel>> getRuteList() async {
    final res = await ApiClient.get(ApiEndpoints.rute);
    if (res is List) {
      return res
          .whereType<Map<String, dynamic>>()
          .map((item) => RuteModel.fromJson(item))
          .toList();
    } else if (res is Map<String, dynamic>) {
      final list = res['data'] ?? res['rute'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map((item) => RuteModel.fromJson(item))
            .toList();
      }
    }
    return [];
  }

  /// Mengambil detail satu rute beserta daftar jadwal pelanggannya
  static Future<RuteModel?> getRuteDetail(int id) async {
    final res = await ApiClient.get(ApiEndpoints.ruteDetail(id));
    if (res is Map<String, dynamic>) {
      if (res['data'] is Map<String, dynamic>) {
        return RuteModel.fromJson(res['data'] as Map<String, dynamic>);
      }
      return RuteModel.fromJson(res);
    }
    return null;
  }

  /// Mengambil daftar jadwal pelanggan berdasarkan rute
  static Future<List<JadwalModel>> getJadwalByRute(int ruteId) async {
    final res = await ApiClient.get(ApiEndpoints.jadwalByRute(ruteId));
    if (res is List) {
      return res
          .whereType<Map<String, dynamic>>()
          .map((item) => JadwalModel.fromJson(item))
          .toList();
    } else if (res is Map<String, dynamic>) {
      final list = res['data'] ?? res['jadwal'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map((item) => JadwalModel.fromJson(item))
            .toList();
      }
    }
    return [];
  }

  /// Mengambil daftar jadwal berdasarkan hari tertentu (misal: "Senin")
  static Future<List<JadwalModel>> getJadwalByHari(String hari) async {
    final res = await ApiClient.get(ApiEndpoints.jadwalByHari(hari));
    if (res is List) {
      return res
          .whereType<Map<String, dynamic>>()
          .map((item) => JadwalModel.fromJson(item))
          .toList();
    } else if (res is Map<String, dynamic>) {
      final list = res['data'] ?? res['jadwal'];
      if (list is List) {
        return list
            .whereType<Map<String, dynamic>>()
            .map((item) => JadwalModel.fromJson(item))
            .toList();
      }
    }
    return [];
  }
}
