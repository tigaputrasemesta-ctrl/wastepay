import 'package:flutter/foundation.dart';
import '../models/rute_model.dart';
import '../services/rute_service.dart';

class RuteProvider extends ChangeNotifier {
  List<RuteModel> _allRute = [];
  bool _isLoading = false;
  String? _errorMessage;

  late String _selectedHari;
  String _searchQuery = '';

  RuteProvider() {
    final today = getNamaHariIni();
    // Jika hari ini Minggu (libur rutin), default tampilkan "Semua" agar rute langsung terlihat
    _selectedHari = today == 'Minggu' ? 'Semua' : 'Hari Ini';
  }

  List<RuteModel> get allRute => _allRute;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedHari => _selectedHari;
  String get searchQuery => _searchQuery;
  bool get isHariIniMinggu => getNamaHariIni() == 'Minggu';

  static const List<String> daftarHari = [
    'Hari Ini',
    'Besok',
    'Semua',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu',
    'Minggu',
  ];

  static String getNamaHariIni() {
    final now = DateTime.now();
    switch (now.weekday) {
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

  static String getNamaBesok() {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    switch (tomorrow.weekday) {
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

  void setSelectedHari(String hari) {
    _selectedHari = hari;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  List<RuteModel> get filteredRute {
    final targetHari = _selectedHari == 'Hari Ini'
        ? getNamaHariIni()
        : _selectedHari == 'Besok'
            ? getNamaBesok()
            : _selectedHari;

    return _allRute.where((r) {
      // 1. Filter Hari
      if (targetHari != 'Semua') {
        if (!r.isOperasionalHari(targetHari)) {
          return false;
        }
      }

      // 2. Filter Pencarian Nama / Wilayah
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase().trim();
        final matchNama = r.nama.toLowerCase().contains(q);
        final matchKelurahan = r.kelurahanNama?.toLowerCase().contains(q) ?? false;
        final matchZona = r.zonaNama?.toLowerCase().contains(q) ?? false;
        final matchPetugas = r.petugasNama?.toLowerCase().contains(q) ?? false;
        if (!matchNama && !matchKelurahan && !matchZona && !matchPetugas) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  int get totalRuteHariIni {
    final today = getNamaHariIni();
    return _allRute.where((r) => r.isOperasionalHari(today)).length;
  }

  Future<void> loadRute() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final routes = await RuteService.getRuteList();
      _allRute = routes;
      _isLoading = false;
      _errorMessage = null;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll("Exception: ", "").replaceAll("ApiException: ", "");
      notifyListeners();
    }
  }
}
