import 'package:flutter/foundation.dart';
import '../models/pelanggan_model.dart';
import '../services/admin_sync_service.dart';

class AdminProvider with ChangeNotifier {
  final AdminSyncService _syncService = AdminSyncService();

  bool _isLoading = false;
  bool _isSyncing = false;
  String _searchQuery = "";
  String _selectedStatus = "semua";
  int? _selectedZonaId;
  String? _statusMessage;

  bool get isLoading => _isLoading;
  bool get isSyncing => _isSyncing;
  String get searchQuery => _searchQuery;
  String get selectedStatus => _selectedStatus;
  int? get selectedZonaId => _selectedZonaId;
  String? get statusMessage => _statusMessage;

  int get totalCached => _syncService.totalCached;
  DateTime? get lastDownloadTime => _syncService.lastDownloadTime;
  String? get lastSyncToken => _syncService.lastSyncToken;

  List<PelangganModel> get displayedPelanggan => _syncService.search(
        query: _searchQuery,
        status: _selectedStatus,
        zonaId: _selectedZonaId,
      );

  // Hitungan status
  int get countAktif =>
      _syncService.cachedPelanggan.where((p) => p.status == 'aktif').length;
  int get countCalon =>
      _syncService.cachedPelanggan.where((p) => p.status == 'calon').length;
  int get countNonaktif =>
      _syncService.cachedPelanggan.where((p) => p.status == 'nonaktif').length;
  int get countLibur =>
      _syncService.cachedPelanggan.where((p) => p.status == 'libur').length;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    await _syncService.init();

    // Jika belum ada data lokal sama sekali, coba unduh master otomatis
    if (_syncService.totalCached == 0) {
      _statusMessage = "Mengunduh data awal master...";
      await _syncService.downloadMaster();
    } else {
      // Auto delta sync di latar belakang
      _syncService.syncDelta().then((changes) {
        if (changes > 0) notifyListeners();
      });
    }

    _isLoading = false;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    notifyListeners();
  }

  void setSelectedStatus(String status) {
    _selectedStatus = status;
    notifyListeners();
  }

  void setSelectedZonaId(int? zonaId) {
    _selectedZonaId = zonaId;
    notifyListeners();
  }

  Future<bool> downloadMaster() async {
    _isSyncing = true;
    _statusMessage = "Mengunduh snapshot data master...";
    notifyListeners();

    final ok = await _syncService.downloadMaster();
    _isSyncing = false;
    _statusMessage = ok
        ? "Berhasil menyimpan ${_syncService.totalCached} data di HP!"
        : "Gagal mengunduh data master";
    notifyListeners();
    return ok;
  }

  Future<int> syncDelta() async {
    _isSyncing = true;
    _statusMessage = "Memeriksa pembaruan baru...";
    notifyListeners();

    final changes = await _syncService.syncDelta();
    _isSyncing = false;
    _statusMessage = changes > 0
        ? "Berhasil menyinkronkan $changes perubahan!"
        : "Data sudah terbaru.";
    notifyListeners();
    return changes;
  }

  Future<void> clearCache() async {
    await _syncService.clearCache();
    _statusMessage = "Cache lokal dibersihkan.";
    notifyListeners();
  }
}
