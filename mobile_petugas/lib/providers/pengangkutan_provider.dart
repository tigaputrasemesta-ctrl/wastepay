import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../models/tugas_model.dart';
import '../services/pengangkutan_service.dart';
import '../services/offline_queue_service.dart';

class PengangkutanProvider with ChangeNotifier {
  List<TugasModel> _tugasList = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _searchQuery = '';
  String _selectedFilter = 'semua'; // 'semua', 'terjadwal', 'diambil', 'dilewati'
  String _currentDateISO = DateFormat('yyyy-MM-dd').format(DateTime.now());
  int _pendingOfflineCount = 0;

  List<TugasModel> get tugasList => _tugasList;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get searchQuery => _searchQuery;
  String get selectedFilter => _selectedFilter;
  String get currentDateISO => _currentDateISO;
  int get pendingOfflineCount => _pendingOfflineCount;
  bool get isToday => _currentDateISO == DateFormat('yyyy-MM-dd').format(DateTime.now());

  String get besokISO {
    final d = DateTime.now().add(const Duration(days: 1));
    return DateFormat('yyyy-MM-dd').format(d);
  }

  String get besokDayName {
    final d = DateTime.now().add(const Duration(days: 1));
    return _getDayName(d.weekday);
  }

  String get formattedDateTitle {
    try {
      final parsed = DateTime.parse(_currentDateISO);
      final dayName = _getDayName(parsed.weekday);
      final monthName = _getMonthName(parsed.month);
      return "$dayName, ${parsed.day} $monthName ${parsed.year}";
    } catch (_) {
      return _currentDateISO;
    }
  }

  static String _getDayName(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return 'Senin';
      case DateTime.tuesday:
        return 'Selasa';
      case DateTime.wednesday:
        return 'Rabu';
      case DateTime.thursday:
        return 'Kamis';
      case DateTime.friday:
        return 'Jumat';
      case DateTime.saturday:
        return 'Sabtu';
      case DateTime.sunday:
        return 'Minggu';
      default:
        return 'Senin';
    }
  }

  static String _getMonthName(int month) {
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return (month >= 1 && month <= 12) ? m[month - 1] : '';
  }

  void nextDay() {
    try {
      final d = DateTime.parse(_currentDateISO).add(const Duration(days: 1));
      setTanggal(DateFormat('yyyy-MM-dd').format(d));
    } catch (_) {}
  }

  void prevDay() {
    try {
      final d = DateTime.parse(_currentDateISO).subtract(const Duration(days: 1));
      setTanggal(DateFormat('yyyy-MM-dd').format(d));
    } catch (_) {}
  }

  void setHariIni() {
    setTanggal(DateFormat('yyyy-MM-dd').format(DateTime.now()));
  }

  void setBesok() {
    setTanggal(besokISO);
  }

  // Statistik
  int get totalTugas => _tugasList.length;
  int get totalSelesai => _tugasList.where((t) => t.isSelesai).length;
  int get totalTerjadwal => _tugasList.where((t) => t.isTerjadwal).length;
  int get totalDilewati => _tugasList.where((t) => t.isDilewati).length;
  double get persentaseSelesai => totalTugas > 0 ? (totalSelesai / totalTugas) : 0.0;

  /// Daftar yang sudah difilter berdasarkan tab & pencarian
  List<TugasModel> get filteredList {
    return _tugasList.where((t) {
      // 1. Filter status tab
      if (_selectedFilter == 'terjadwal' && !t.isTerjadwal) return false;
      if (_selectedFilter == 'diambil' && !t.isSelesai) return false;
      if (_selectedFilter == 'dilewati' && !t.isDilewati) return false;

      // 2. Filter search query
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchNama = t.pelanggan.nama.toLowerCase().contains(q);
        final matchAlamat = t.pelanggan.alamat.toLowerCase().contains(q);
        final matchKode = t.pelanggan.kodePelanggan.toLowerCase().contains(q);
        if (!matchNama && !matchAlamat && !matchKode) return false;
      }

      return true;
    }).toList();
  }

  void setSearchQuery(String q) {
    _searchQuery = q;
    notifyListeners();
  }

  void setFilter(String filter) {
    _selectedFilter = filter;
    notifyListeners();
  }

  void setTanggal(String dateISO) {
    _currentDateISO = dateISO;
    loadTugas();
  }

  Future<void> checkPendingOffline() async {
    _pendingOfflineCount = await OfflineQueueService.getPendingCount();
    notifyListeners();
  }

  Future<void> loadTugas() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // Coba sync antrean offline dulu jika ada koneksi
    try {
      await OfflineQueueService.syncQueue();
    } catch (_) {}

    await checkPendingOffline();

    try {
      _tugasList = await PengangkutanService.getTugasHariIni(_currentDateISO);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update state lokal secara instan (optimistic UI update untuk pengemudi)
  void _updateLocalTaskStatus(int taskId, String newStatus, {String? catatan}) {
    final idx = _tugasList.indexWhere((t) => t.id == taskId);
    if (idx != -1) {
      final old = _tugasList[idx];
      _tugasList[idx] = TugasModel(
        id: old.id,
        tanggal: old.tanggal,
        status: newStatus,
        volume: old.volume,
        berat: old.berat,
        jenisSampah: old.jenisSampah,
        catatan: catatan ?? old.catatan,
        urutan: old.urutan,
        pelanggan: old.pelanggan,
        tunggakan: old.tunggakan,
      );
      notifyListeners();
    }
  }

  /// 1-Tap Quick Pickup Cepat (Offline-Resilient)
  Future<bool> quickPickup(int taskId, {double? lat, double? lng}) async {
    // 1. Optimistic Update di UI driver
    _updateLocalTaskStatus(taskId, 'diambil');

    try {
      await PengangkutanService.updateStatus(
        taskId: taskId,
        status: 'diambil',
        catatan: 'Pickup cepat via Aplikasi Android Flutter (1-Tap)',
        latitude: lat,
        longitude: lng,
        jenisSampah: 'campuran',
      );
      return true;
    } catch (e) {
      // Jika jaringan gagal, simpan ke antrean offline
      await OfflineQueueService.enqueue(
        OfflinePickupItem(
          taskId: taskId,
          status: 'diambil',
          catatan: 'Pickup offline tersimpan',
          latitude: lat,
          longitude: lng,
          jenisSampah: 'campuran',
          timestamp: DateTime.now().toIso8601String(),
        ),
      );
      await checkPendingOffline();
      return true; // Tetap sukses bagi supir agar tidak menghambat operasional
    }
  }

  /// Lewati rumah menunggak atau rumah kosong (Offline-Resilient)
  Future<bool> lewatiRumah(int taskId, String status, String alasan) async {
    _updateLocalTaskStatus(taskId, status, catatan: alasan);

    try {
      await PengangkutanService.updateStatus(
        taskId: taskId,
        status: status, // "tidak_diangkut" atau "kosong"
        catatan: alasan,
      );
      return true;
    } catch (e) {
      await OfflineQueueService.enqueue(
        OfflinePickupItem(
          taskId: taskId,
          status: status,
          catatan: alasan,
          timestamp: DateTime.now().toIso8601String(),
        ),
      );
      await checkPendingOffline();
      return true;
    }
  }
}
