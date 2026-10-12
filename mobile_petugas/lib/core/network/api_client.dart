import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../storage/token_storage.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiClient {
  static const Duration timeoutDuration = Duration(seconds: 15);

  /// Helper untuk HTTP GET
  static Future<dynamic> get(String url) async {
    return _request(() async {
      final headers = await _getHeaders();
      return await http.get(Uri.parse(url), headers: headers).timeout(timeoutDuration);
    });
  }

  /// Helper untuk HTTP POST
  static Future<dynamic> post(String url, {Map<String, dynamic>? body}) async {
    return _request(() async {
      final headers = await _getHeaders();
      final bodyJson = body != null ? jsonEncode(body) : null;
      return await http.post(Uri.parse(url), headers: headers, body: bodyJson).timeout(timeoutDuration);
    });
  }

  /// Helper untuk HTTP PUT
  static Future<dynamic> put(String url, {Map<String, dynamic>? body}) async {
    return _request(() async {
      final headers = await _getHeaders();
      final bodyJson = body != null ? jsonEncode(body) : null;
      return await http.put(Uri.parse(url), headers: headers, body: bodyJson).timeout(timeoutDuration);
    });
  }

  /// Header default dengan Authorization Bearer & Cookie sesi jika token tersedia
  static Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = await TokenStorage.getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
      headers['Cookie'] = 'session=$token; auth-token=$token; __Host-session=$token';
    }
    return headers;
  }

  /// Eksekusi request dan handle response / error
  static Future<dynamic> _request(Future<http.Response> Function() action) async {
    try {
      final response = await action();
      return _processResponse(response);
    } on SocketException {
      throw ApiException("Tidak dapat terhubung ke server. Periksa koneksi internet.");
    } on TimeoutException {
      throw ApiException("Permintaan ke server memakan waktu terlalu lama (Timeout).");
    } on FormatException {
      throw ApiException("Format respon server tidak valid.");
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException("Terjadi kendala jaringan: $e");
    }
  }

  static dynamic _processResponse(http.Response response) {
    dynamic bodyData;
    try {
      if (response.body.isNotEmpty) {
        bodyData = jsonDecode(response.body);
      }
    } catch (_) {
      bodyData = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return bodyData;
    }

    String errorMsg = "Terjadi kesalahan (Kode: ${response.statusCode})";
    if (bodyData is Map && bodyData['error'] != null) {
      errorMsg = bodyData['error'].toString();
    } else if (bodyData is Map && bodyData['message'] != null) {
      errorMsg = bodyData['message'].toString();
    }

    if (response.statusCode == 401) {
      throw ApiException("Sesi login berakhir. Silakan login kembali.", statusCode: 401);
    } else if (response.statusCode == 403) {
      throw ApiException("Akses ditolak: Anda tidak memiliki wewenang untuk aksi ini.", statusCode: 403);
    }

    throw ApiException(errorMsg, statusCode: response.statusCode);
  }
}
