import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

class RouteStep {
  final String instruction;
  final String streetName;
  final double distanceMeters;
  final String modifier; // left, right, straight, etc.

  RouteStep({
    required this.instruction,
    required this.streetName,
    required this.distanceMeters,
    required this.modifier,
  });
}

class RouteResult {
  final List<LatLng> points;
  final double totalDistanceMeters;
  final double totalDurationSeconds;
  final List<RouteStep> steps;

  RouteResult({
    required this.points,
    required this.totalDistanceMeters,
    required this.totalDurationSeconds,
    required this.steps,
  });

  String get formattedDistance {
    if (totalDistanceMeters < 1000) {
      return "${totalDistanceMeters.round()} m";
    }
    return "${(totalDistanceMeters / 1000).toStringAsFixed(1)} km";
  }

  String get formattedDuration {
    final minutes = (totalDurationSeconds / 60).round();
    if (minutes < 1) return "< 1 mnt";
    if (minutes >= 60) {
      final hours = minutes ~/ 60;
      final remMin = minutes % 60;
      return "$hours jam $remMin mnt";
    }
    return "$minutes mnt";
  }
}

class RoutingService {
  /// Mengambil rute jalan raya nyata (real road geometry) via OSRM Driving API (gratis & mandiri)
  static Future<RouteResult?> getDrivingRoute(LatLng start, LatLng end) async {
    try {
      // OSRM menggunakan urutan: longitude,latitude
      final startStr = "${start.longitude},${start.latitude}";
      final endStr = "${end.longitude},${end.latitude}";

      final url = Uri.parse(
        "https://router.project-osrm.org/route/v1/driving/$startStr;$endStr?steps=true&geometries=geojson&overview=full",
      );

      final response = await http.get(url).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['code'] == 'Ok' && data['routes'] is List && (data['routes'] as List).isNotEmpty) {
          final route = data['routes'][0];
          final geometry = route['geometry'];
          final coordinates = geometry['coordinates'] as List;

          final points = coordinates.map<LatLng>((coord) {
            final lng = (coord[0] as num).toDouble();
            final lat = (coord[1] as num).toDouble();
            return LatLng(lat, lng);
          }).toList();

          final totalDist = (route['distance'] as num?)?.toDouble() ?? 0.0;
          final totalDur = (route['duration'] as num?)?.toDouble() ?? 0.0;

          // Parse steps
          final steps = <RouteStep>[];
          if (route['legs'] is List && (route['legs'] as List).isNotEmpty) {
            final leg = route['legs'][0];
            if (leg['steps'] is List) {
              for (final s in leg['steps']) {
                final maneuver = s['maneuver'] as Map<String, dynamic>? ?? {};
                final type = maneuver['type']?.toString() ?? '';
                final modifier = maneuver['modifier']?.toString() ?? '';
                final streetName = s['name']?.toString() ?? '';
                final dist = (s['distance'] as num?)?.toDouble() ?? 0.0;

                String instruction = _formatInstruction(type, modifier, streetName);

                steps.add(RouteStep(
                  instruction: instruction,
                  streetName: streetName,
                  distanceMeters: dist,
                  modifier: modifier,
                ));
              }
            }
          }

          return RouteResult(
            points: points,
            totalDistanceMeters: totalDist,
            totalDurationSeconds: totalDur,
            steps: steps,
          );
        }
      }
    } catch (_) {
      // Fallback diam jika koneksi OSRM offline/gagal
    }
    return null;
  }

  static String _formatInstruction(String type, String modifier, String streetName) {
    String action = "Lurus terus";
    if (modifier.contains('left')) {
      action = modifier.contains('slight')
          ? "Sedikit ke kiri"
          : modifier.contains('sharp')
              ? "Belok tajam ke kiri"
              : "Belok kiri";
    } else if (modifier.contains('right')) {
      action = modifier.contains('slight')
          ? "Sedikit ke kanan"
          : modifier.contains('sharp')
              ? "Belok tajam ke kanan"
              : "Belok kanan";
    } else if (modifier.contains('u-turn') || modifier.contains('uturn')) {
      action = "Putar balik";
    }

    if (type == 'depart') action = "Mulai perjalanan";
    if (type == 'arrive') action = "Tiba di tujuan";
    if (type == 'roundabout') action = "Masuk bundaran";

    if (streetName.trim().isNotEmpty) {
      return "$action ke $streetName";
    }
    return action;
  }
}
