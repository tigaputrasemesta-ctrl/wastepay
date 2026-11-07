import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class ExternalNavigationService {
  /// Buka aplikasi Waze untuk navigasi turn-by-turn
  static Future<bool> openWaze(double lat, double lng) async {
    final wazeAppUri = Uri.parse("waze://?ll=$lat,$lng&navigate=yes");
    final wazeWebUri = Uri.parse("https://waze.com/ul?ll=$lat,$lng&navigate=yes");

    try {
      if (await canLaunchUrl(wazeAppUri)) {
        return await launchUrl(wazeAppUri);
      } else {
        return await launchUrl(wazeWebUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      return false;
    }
  }

  /// Buka aplikasi Google Maps untuk navigasi turn-by-turn
  static Future<bool> openGoogleMaps(double lat, double lng) async {
    final gmapsAppUri = Uri.parse("google.navigation:q=$lat,$lng&mode=d");
    final gmapsWebUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$lat,$lng&travelmode=driving");

    try {
      if (await canLaunchUrl(gmapsAppUri)) {
        return await launchUrl(gmapsAppUri);
      } else {
        return await launchUrl(gmapsWebUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      return false;
    }
  }

  /// Tampilkan BottomSheet pilihan navigasi (Waze vs Google Maps)
  static void showNavigationChooser(BuildContext context, {
    required double lat,
    required double lng,
    required String namaPelanggan,
    String? alamat,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A), // Slate 900
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.navigation_rounded, color: Color(0xFF38BDF8), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "Pilih Aplikasi Navigasi",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          namaPelanggan,
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Opsi 1: Waze
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  openWaze(lat, lng);
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B), // Slate 800
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: const Color(0xFF33CCFF), // Waze Cyan
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Center(
                          child: Text("🚙", style: TextStyle(fontSize: 22)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Waze Navigation",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              "Info kemacetan & rute tercepat real-time",
                              style: TextStyle(color: Colors.white60, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Colors.white54),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 10),

              // Opsi 2: Google Maps
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  openGoogleMaps(lat, lng);
                },
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: const Color(0xFF34A853), // Google Maps Green
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Center(
                          child: Text("📍", style: TextStyle(fontSize: 22)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Google Maps",
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              "Navigasi belokan akurat & nomor rumah",
                              style: TextStyle(color: Colors.white60, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Colors.white54),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
