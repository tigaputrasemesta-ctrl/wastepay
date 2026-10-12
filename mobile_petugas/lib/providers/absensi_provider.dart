import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../models/absensi_model.dart';
import '../services/absensi_service.dart';
import '../services/tracking_service.dart';

class AbsensiProvider with ChangeNotifier {
  AbsensiModel? _absensiHariIni;
  bool _isLoading = false;
  String? _errorMessage;

  AbsensiModel? get absensiHariIni => _absensiHariIni;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadStatus() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _absensiHariIni = await AbsensiService.getStatusHariIni();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Proses Absen dengan mengambil GPS & Foto Kamera
  Future<bool> submitAbsen({
    required String tipe, // "masuk" atau "selesai"
    required XFile fotoFile,
    String? catatan,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. Ambil koordinat GPS perangkat
      final hasPerm = await TrackingService.checkAndRequestPermission();
      if (!hasPerm) {
        throw Exception("Izin lokasi GPS belum diberikan. Buka pengaturan aplikasi untuk mengizinkan.");
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );

      // 2. Baca file foto dan konversi ke base64 (format data:image/jpeg;base64,...)
      final bytes = await File(fotoFile.path).readAsBytes();
      final base64String = "data:image/jpeg;base64,${base64Encode(bytes)}";

      // 3. Kirim ke API absensi
      _absensiHariIni = await AbsensiService.kirimAbsen(
        tipe: tipe,
        latitude: position.latitude,
        longitude: position.longitude,
        fotoBase64: base64String,
        catatan: catatan,
      );

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
