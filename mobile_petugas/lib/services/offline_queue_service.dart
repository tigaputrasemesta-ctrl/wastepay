import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'pengangkutan_service.dart';

class OfflinePickupItem {
  final int taskId;
  final String status;
  final String? catatan;
  final double? latitude;
  final double? longitude;
  final double? volume;
  final double? berat;
  final String? jenisSampah;
  final String? fotoBuktiBase64;
  final String timestamp;

  OfflinePickupItem({
    required this.taskId,
    required this.status,
    this.catatan,
    this.latitude,
    this.longitude,
    this.volume,
    this.berat,
    this.jenisSampah,
    this.fotoBuktiBase64,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'taskId': taskId,
        'status': status,
        'catatan': catatan,
        'latitude': latitude,
        'longitude': longitude,
        'volume': volume,
        'berat': berat,
        'jenisSampah': jenisSampah,
        'fotoBuktiBase64': fotoBuktiBase64,
        'timestamp': timestamp,
      };

  factory OfflinePickupItem.fromJson(Map<String, dynamic> json) => OfflinePickupItem(
        taskId: json['taskId'] as int,
        status: json['status'] as String,
        catatan: json['catatan'] as String?,
        latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
        longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
        volume: json['volume'] != null ? (json['volume'] as num).toDouble() : null,
        berat: json['berat'] != null ? (json['berat'] as num).toDouble() : null,
        jenisSampah: json['jenisSampah'] as String?,
        fotoBuktiBase64: json['fotoBuktiBase64'] as String?,
        timestamp: json['timestamp'] as String? ?? DateTime.now().toIso8601String(),
      );
}

class OfflineQueueService {
  static const _keyQueue = 'offline_pickup_queue';
  static bool _isSyncing = false;

  /// Tambahkan pickup ke antrean offline jika jaringan gagal
  static Future<void> enqueue(OfflinePickupItem item) async {
    final prefs = await SharedPreferences.getInstance();
    final list = await getQueue();
    // Cegah duplikasi untuk task yang sama (timpa dengan status terakhir)
    list.removeWhere((i) => i.taskId == item.taskId);
    list.add(item);

    final rawJson = jsonEncode(list.map((i) => i.toJson()).toList());
    await prefs.setString(_keyQueue, rawJson);
  }

  /// Ambil semua antrean offline
  static Future<List<OfflinePickupItem>> getQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_keyQueue);
      if (raw == null || raw.isEmpty) return [];

      final decoded = jsonDecode(raw) as List;
      return decoded.map((i) => OfflinePickupItem.fromJson(i as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Jumlah antrean offline yang belum tersinkron
  static Future<int> getPendingCount() async {
    final list = await getQueue();
    return list.length;
  }

  /// Proses sinkronisasi antrean ke server saat koneksi pulih
  static Future<int> syncQueue() async {
    if (_isSyncing) return 0;
    _isSyncing = true;

    int syncedCount = 0;
    try {
      final list = await getQueue();
      if (list.isEmpty) {
        _isSyncing = false;
        return 0;
      }

      final remaining = <OfflinePickupItem>[];

      for (final item in list) {
        try {
          await PengangkutanService.updateStatus(
            taskId: item.taskId,
            status: item.status,
            catatan: item.catatan,
            latitude: item.latitude,
            longitude: item.longitude,
            volume: item.volume,
            berat: item.berat,
            jenisSampah: item.jenisSampah,
            fotoBuktiBase64: item.fotoBuktiBase64,
          );
          syncedCount++;
        } catch (e) {
          debugPrint("Gagal sync task #${item.taskId}: $e");
          remaining.add(item);
        }
      }

      final prefs = await SharedPreferences.getInstance();
      if (remaining.isEmpty) {
        await prefs.remove(_keyQueue);
      } else {
        await prefs.setString(_keyQueue, jsonEncode(remaining.map((i) => i.toJson()).toList()));
      }
    } finally {
      _isSyncing = false;
    }

    return syncedCount;
  }
}
