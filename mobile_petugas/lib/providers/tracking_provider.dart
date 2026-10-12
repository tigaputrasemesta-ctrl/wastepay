import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../services/tracking_service.dart';

class TrackingProvider with ChangeNotifier {
  bool _isTracking = false;
  Position? _currentPosition;
  Timer? _beaconTimer;
  int? _kendaraanId;
  int? _petugasId;

  bool get isTracking => _isTracking;
  Position? get currentPosition => _currentPosition;

  void setContextIds({int? kendaraanId, int? petugasId}) {
    _kendaraanId = kendaraanId;
    _petugasId = petugasId;
  }

  /// Aktifkan live tracking GPS
  Future<bool> startTracking() async {
    final hasPerm = await TrackingService.checkAndRequestPermission();
    if (!hasPerm) return false;

    _isTracking = true;
    notifyListeners();

    // Kirim posisi pertama kali langsung
    await _sendCurrentBeacon();

    // Jalankan timer periodik setiap 15 detik
    _beaconTimer?.cancel();
    _beaconTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      _sendCurrentBeacon();
    });

    return true;
  }

  /// Hentikan live tracking GPS
  void stopTracking() {
    _beaconTimer?.cancel();
    _beaconTimer = null;
    _isTracking = false;
    notifyListeners();
  }

  Future<void> _sendCurrentBeacon() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      _currentPosition = pos;
      notifyListeners();

      await TrackingService.sendLocationUpdate(
        position: pos,
        kendaraanId: _kendaraanId,
        petugasId: _petugasId,
      );
    } catch (_) {}
  }

  @override
  void dispose() {
    _beaconTimer?.cancel();
    super.dispose();
  }
}
