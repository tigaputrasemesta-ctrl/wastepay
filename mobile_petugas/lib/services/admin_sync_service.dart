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
  Future<bool> downloadMaster() async {
    try {
      final token = await TokenStorage.getToken();
      final url = Uri.parse("${ApiEndpoints.baseUrl}/api/sync/master");

      final res = await http.get(
        url,
        headers: {
          "Content-Type": "application/json",
          if (token != null) "Authorization": "Bearer $token",
        },
      );

      if (res.statusCode != 200) {
        debugPrint("[AdminSyncService] Error download master: ${res.statusCode} ${res.body}");
        return false;
      }

      final Map<String, dynamic> body = jsonDecode(res.body);
      final String? serverTime = body['serverTime']?.toString();
      final data = body['data'] as Map<String, dynamic>?;

      if (data != null && data['pelanggan'] is List) {
        final List<dynamic> pList = data['pelanggan'];
        _cachedPelanggan = pList
            .map((item) => PelangganModel.fromJson(item as Map<String, dynamic>))
            .toList();

        _lastSyncToken = serverTime;
        _lastDownloadTime = DateTime.now();

        // Simpan ke SharedPreferences
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
          _keyMasterPelanggan,
          jsonEncode(_cachedPelanggan.map((p) => p.toJson()).toList()),
        );
        if (serverTime != null) {
          await prefs.setString(_keyLastSyncToken, serverTime);
        }
        await prefs.setString(_keyLastDownloadTime, _lastDownloadTime!.toIso8601String());

        return true;
      }
      return false;
    } catch (e) {
      debugPrint("[AdminSyncService] Exception download master: $e");
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
      final token = await TokenStorage.getToken();
      final encodedSince = Uri.encodeComponent(_lastSyncToken!);
      final url = Uri.parse("${ApiEndpoints.baseUrl}/api/sync/delta?since=$encodedSince");

      final res = await http.get(
        url,
        headers: {
          "Content-Type": "application/json",
          if (token != null) "Authorization": "Bearer $token",
        },
      );

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

        // Simpan cache terbaru
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(
          _keyMasterPelanggan,
          jsonEncode(_cachedPelanggan.map((p) => p.toJson()).toList()),
        );

        if (serverTime != null) {
          _lastSyncToken = serverTime;
          await prefs.setString(_keyLastSyncToken, serverTime);
        }
      }

      return totalChanges;
    } catch (e) {
      debugPrint("[AdminSyncService] Exception delta sync: $e");
      return 0;
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
