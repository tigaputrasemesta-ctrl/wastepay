import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _storage = FlutterSecureStorage();
  static const _keyToken = 'auth_token';
  static const _keyBaseUrl = 'server_base_url';
  static const _keyUserJson = 'cached_user_json';

  /// Simpan JWT token secara aman
  static Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  /// Ambil JWT token
  static Future<String?> getToken() async {
    try {
      return await _storage.read(key: _keyToken);
    } catch (_) {
      // Fallback jika secure storage error di device tertentu
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_keyToken);
    }
  }

  /// Hapus sesi saat logout
  static Future<void> clear() async {
    await _storage.delete(key: _keyToken);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUserJson);
    await prefs.remove(_keyToken);
  }

  /// Simpan override Base URL jika diubah
  static Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, url);
  }

  /// Ambil saved Base URL
  static Future<String?> getSavedBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyBaseUrl);
  }

  /// Cache data user
  static Future<void> saveUserJson(String jsonStr) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUserJson, jsonStr);
  }

  /// Ambil cache data user
  static Future<String?> getUserJson() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyUserJson);
  }
}
