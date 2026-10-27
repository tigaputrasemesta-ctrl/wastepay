import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../core/constants/api_endpoints.dart';
import '../core/storage/token_storage.dart';
import '../models/pelanggan_model.dart';

class AdminSyncService {
  static const String _keyMasterPelanggan = "admin_cached_pelanggan_v1";
  static const String _keyLastSyncToken = "admin_last_sync_token";
  static const String _keyLastDownloadTime = "admin_last_download_time";

  List<PelangganModel> _cachedPelanggan = [];
  String? _lastSyncToken;
  DateTime? _lastDownloadTime;

  List<PelangganModel> get cachedPelanggan => _cachedPelanggan;
  String? get lastSyncToken => _lastSyncToken;
  DateTime? get lastDownloadTime => _lastDownloadTime;
  int get totalCached => _cachedPelanggan.length;

  static Future<Map<String, String>> _buildHeaders() async {
    final token = await TokenStorage.getToken();
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      if (token != null && token.isNotEmpty) "Authorization": "Bearer $token",
      if (token != null && token.isNotEmpty)
        "Cookie": "session=$token; auth-token=$token; __Host-session=$token",
    };
  }

  /// Inisialisasi: memuat cache lokal dari SharedPreferences
  Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _lastSyncToken = prefs.getString(_keyLastSyncToken);

      final lastTimeStr = prefs.getString(_keyLastDownloadTime);
      if (lastTimeStr != null) {
        _lastDownloadTime = DateTime.tryParse(lastTimeStr);
      }

      final rawJson = prefs.getString(_keyMasterPelanggan);
      if (rawJson != null && rawJson.isNotEmpty) {
        final List<dynamic> decoded = jsonDecode(rawJson);
        _cachedPelanggan = decoded
            .map((item) => PelangganModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint("[AdminSyncService] Gagal membaca cache lokal: $e");
    }
  }

  /// Download Snapshot Master Penuh dari server
  /// Dilengkapi fallback otomatis ke /api/pelanggan jika endpoint sync mengalami kendala
  Future<bool> downloadMaster() async {
    final headers = await _buildHeaders();

    // 1. Coba Endpoint Utama: /api/sync/master
    try {
      final url = Uri.parse("${ApiEndpoints.baseUrl}/api/sync/master");
      final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 25));

      if (res.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(res.body);
        final String? serverTime = body['serverTime']?.toString();
        final data = body['data'] as Map<String, dynamic>?;

        if (data != null && data['pelanggan'] is List) {
          final List<dynamic> pList = data['pelanggan'];
          _cachedPelanggan = pList
              .map((item) => PelangganModel.fromJson(item as Map<String, dynamic>))
              .toList();

          _lastSyncToken = serverTime ?? DateTime.now().toIso8601String();
          _lastDownloadTime = DateTime.now();
          await _saveToDisk();
          return true;
        }
      }
      debugPrint("[AdminSyncService] /api/sync/master status ${res.statusCode}, beralih ke fallback...");
    } catch (e) {
      debugPrint("[AdminSyncService] Exception /api/sync/master: $e, beralih ke fallback...");
    }

    // 2. Fallback Otomatis: /api/pelanggan
    try {
      final url = Uri.parse("${ApiEndpoints.baseUrl}/api/pelanggan");
      final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 25));

      if (res.statusCode == 200) {
        final dynamic decoded = jsonDecode(res.body);
        List<dynamic> pList = [];

        if (decoded is List) {
          pList = decoded;
        } else if (decoded is Map<String, dynamic> && decoded['pelanggan'] is List) {
          pList = decoded['pelanggan'];
        }

        if (pList.isNotEmpty) {
          _cachedPelanggan = pList
              .map((item) => PelangganModel.fromJson(item as Map<String, dynamic>))
              .toList();

          _lastSyncToken = DateTime.now().toIso8601String();
          _lastDownloadTime = DateTime.now();
          await _saveToDisk();
          return true;
        }
      }
      debugPrint("[AdminSyncService] Fallback /api/pelanggan gagal: ${res.statusCode}");
      return false;
    } catch (e) {
      debugPrint("[AdminSyncService] Fallback exception: $e");
      return false;
    }
  }

  /// Delta Sync: Hanya mengunduh data yang berubah sejak timestamp terakhir
  Future<int> syncDelta() async {
    if (_lastSyncToken == null) {
      final ok = await downloadMaster();
      return ok ? _cachedPelanggan.length : 0;
    }

    try {
      final headers = await _buildHeaders();
      final encodedSince = Uri.encodeComponent(_lastSyncToken!);
      final url = Uri.parse("${ApiEndpoints.baseUrl}/api/sync/delta?since=$encodedSince");

      final res = await http.get(url, headers: headers).timeout(const Duration(seconds: 20));

      if (res.statusCode != 200) {
        debugPrint("[AdminSyncService] Error delta sync: ${res.statusCode}");
        return 0;
      }

      final Map<String, dynamic> body = jsonDecode(res.body);
      final String? serverTime = body['serverTime']?.toString();
      final bool hasChanges = body['hasChanges'] == true;
      final int totalChanges = body['totalChanges'] is int ? body['totalChanges'] : 0;

      if (hasChanges) {
        final data = body['data'] as Map<String, dynamic>?;
        final deleted = body['deleted'] as List<dynamic>?;

        // 1. Terapkan pembaruan pelanggan
        if (data != null && data['pelanggan'] is List) {
          final List<dynamic> updatedList = data['pelanggan'];
          final updatedModels = updatedList
              .map((item) => PelangganModel.fromJson(item as Map<String, dynamic>))
              .toList();

          final map = {for (var p in _cachedPelanggan) p.id: p};
          for (var p in updatedModels) {
            map[p.id] = p;
          }
          _cachedPelanggan = map.values.toList();
        }

        // 2. Hapus data yang di-soft delete
        if (deleted != null) {
          final deletedIds = deleted
              .where((d) => d['entity'] == 'pelanggan')
              .map((d) => d['id'] is int ? d['id'] as int : int.tryParse(d['id'].toString()) ?? 0)
              .toSet();

          _cachedPelanggan.removeWhere((p) => deletedIds.contains(p.id));
        }

        _lastSyncToken = serverTime ?? DateTime.now().toIso8601String();
        await _saveToDisk();
      }

      return totalChanges;
    } catch (e) {
      debugPrint("[AdminSyncService] Exception delta sync: $e");
      return 0;
    }
  }

  Future<void> _saveToDisk() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _keyMasterPelanggan,
      jsonEncode(_cachedPelanggan.map((p) => p.toJson()).toList()),
    );
    if (_lastSyncToken != null) {
      await prefs.setString(_keyLastSyncToken, _lastSyncToken!);
    }
    if (_lastDownloadTime != null) {
      await prefs.setString(_keyLastDownloadTime, _lastDownloadTime!.toIso8601String());
    }
  }

  /// Pencarian instan 0 milidetik pada memori lokal
  List<PelangganModel> search({
    String query = "",
    String? status,
    int? zonaId,
  }) {
    var result = List<PelangganModel>.from(_cachedPelanggan);

    if (status != null && status.isNotEmpty && status != "semua") {
      result = result.where((p) => p.status.toLowerCase() == status.toLowerCase()).toList();
    }

    if (zonaId != null) {
      result = result.where((p) => p.zonaId == zonaId).toList();
    }

    if (query.trim().isNotEmpty) {
      final q = query.trim().toLowerCase();
      result = result.where((p) {
        return p.nama.toLowerCase().contains(q) ||
            p.kodePelanggan.toLowerCase().contains(q) ||
            p.noTelepon.contains(q) ||
            p.alamat.toLowerCase().contains(q);
      }).toList();
    }

    return result;
  }

  /// Bersihkan seluruh cache HP
  Future<void> clearCache() async {
    _cachedPelanggan.clear();
    _lastSyncToken = null;
    _lastDownloadTime = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyMasterPelanggan);
    await prefs.remove(_keyLastSyncToken);
    await prefs.remove(_keyLastDownloadTime);
  }
}
