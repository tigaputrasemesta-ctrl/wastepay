import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../models/calon_pelanggan_model.dart';
import '../services/survei_service.dart';
import '../services/tracking_service.dart';

class SurveiProvider with ChangeNotifier {
  List<CalonPelangganModel> _calonList = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<CalonPelangganModel> get calonList => _calonList;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadCalonList({String? kelurahan}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _calonList = await SurveiService.getCalonList(kelurahan: kelurahan);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Submit verifikasi calon pelanggan: ambil GPS akurat & foto rumah
  Future<bool> submitSurvei({
    required int id,
    required XFile fotoFile,
    String? patokanLokasi,
    String? kategori,
    String? customTarif,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final hasPerm = await TrackingService.checkAndRequestPermission();
      if (!hasPerm) {
        throw Exception("Izin GPS diperlukan untuk geotagging lokasi rumah warga.");
      }

      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 12),
      );

      final bytes = await File(fotoFile.path).readAsBytes();
      final base64String = "data:image/jpeg;base64,${base64Encode(bytes)}";

      await SurveiService.submitSurvei(
        id: id,
        latitude: pos.latitude,
        longitude: pos.longitude,
        fotoRumahBase64: base64String,
        patokanLokasi: patokanLokasi,
        kategori: kategori,
        customTarif: customTarif,
      );

      // Hapus dari list lokal atau reload
      _calonList.removeWhere((c) => c.id == id);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
