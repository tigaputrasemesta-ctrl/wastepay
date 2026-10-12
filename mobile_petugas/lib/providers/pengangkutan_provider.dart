import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';
import '../models/tugas_model.dart';
import '../services/pengangkutan_service.dart';

class PengangkutanProvider with ChangeNotifier {
  List<TugasModel> _tugasList = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _searchQuery = '';
  String _selectedFilter = 'semua'; // 'semua', 'terjadwal', 'diambil', 'dilewati'
  String _currentDateISO = DateFormat('yyyy-MM-dd').format(DateTime.now());

  List<TugasModel> get tugasList => _tugasList;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get searchQuery => _searchQuery;
  String get selectedFilter => _selectedFilter;
  String get currentDateISO => _currentDateISO;

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

  Future<void> loadTugas() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

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

  /// 1-Tap Quick Pickup Cepat
  Future<bool> quickPickup(int taskId, {double? lat, double? lng}) async {
    try {
      await PengangkutanService.updateStatus(
        taskId: taskId,
        status: 'diambil',
        catatan: 'Pickup cepat via Aplikasi Android Flutter (1-Tap)',
        latitude: lat,
        longitude: lng,
        jenisSampah: 'campuran',
      );

      // Refresh data
      await loadTugas();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Lewati rumah menunggak atau rumah kosong
  Future<bool> lewatiRumah(int taskId, String status, String alasan) async {
    try {
      await PengangkutanService.updateStatus(
        taskId: taskId,
        status: status, // "tidak_diangkut" atau "kosong"
        catatan: alasan,
      );

      await loadTugas();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }
}
