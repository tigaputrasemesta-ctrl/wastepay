import 'dart:convert';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';
import '../models/petugas_model.dart';

class AuthService {
  /// Login menggunakan email dan password
  static Future<UserModel> login(String email, String password) async {
    final res = await ApiClient.post(
      ApiEndpoints.login,
      body: {
        'email': email.trim(),
        'password': password,
      },
    );

    if (res is Map && res['token'] != null) {
      final token = res['token'].toString();
      await TokenStorage.saveToken(token);

      final user = UserModel.fromJson(res['user'] as Map<String, dynamic>);
      await TokenStorage.saveUserJson(jsonEncode(user.toJson()));
      return user;
    }

    throw ApiException("Respon server tidak memuat token otorisasi.");
  }

  /// Ambil profil petugas saat ini
  static Future<PetugasModel> getProfile() async {
    final res = await ApiClient.get(ApiEndpoints.profile);
    if (res is Map<String, dynamic>) {
      return PetugasModel.fromJson(res);
    }
    throw ApiException("Format data profil tidak valid.");
  }

  /// Logout dan bersihkan sesi
  static Future<void> logout() async {
    await TokenStorage.clear();
  }
}
