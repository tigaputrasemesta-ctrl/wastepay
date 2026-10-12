import 'package:geolocator/geolocator.dart';
import '../core/constants/api_endpoints.dart';
import '../core/network/api_client.dart';

class TrackingService {
  /// Kirim sinyal beacon GPS armada truk ke server
  static Future<void> sendLocationUpdate({
    required Position position,
    int? kendaraanId,
    int? petugasId,
  }) async {
    final body = <String, dynamic>{
      'latitude': position.latitude,
      'longitude': position.longitude,
      'speed': position.speed,
      'heading': position.heading,
      'accuracy': position.accuracy,
      'altitude': position.altitude,
      if (kendaraanId != null) 'kendaraanId': kendaraanId,
      if (petugasId != null) 'petugasId': petugasId,
    };

    try {
      await ApiClient.post(ApiEndpoints.tracking, body: body);
    } catch (_) {
      // Abaikan error jaringan sementara pada live beacon
    }
  }

  /// Periksa dan minta izin GPS
  static Future<bool> checkAndRequestPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }
}
