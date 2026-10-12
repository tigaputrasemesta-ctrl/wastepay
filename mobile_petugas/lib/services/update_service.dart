import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../models/app_update_model.dart';

class UpdateService {
  /// Cek versi terbaru dari backend WastePay
  static Future<AppUpdateModel?> checkUpdate() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.version);
      if (res is Map<String, dynamic>) {
        return AppUpdateModel.fromJson(res, ApiEndpoints.baseUrl);
      }
    } catch (_) {
      // Abaikan jika offline / server tidak merespon saat startup
    }
    return null;
  }
}
