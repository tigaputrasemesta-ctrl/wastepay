import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/tracking_provider.dart';
import '../../widgets/custom_button.dart';

class LiveTrackingScreen extends StatelessWidget {
  const LiveTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final tracking = context.watch<TrackingProvider>();
    final pos = tracking.currentPosition;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Live Tracking GPS Truk"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: tracking.isTracking ? AppColors.successBg : AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: tracking.isTracking ? AppColors.success.withValues(alpha: 0.3) : AppColors.border,
                ),
              ),
              child: Column(
                children: [
                  Icon(
                    tracking.isTracking ? Icons.radar_rounded : Icons.location_off_rounded,
                    size: 56,
                    color: tracking.isTracking ? AppColors.success : AppColors.textMuted,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    tracking.isTracking ? "GPS BEACON AKTIF" : "GPS BEACON NONAKTIF",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: tracking.isTracking ? AppColors.success : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    tracking.isTracking
                        ? "Lokasi armada sedang dipancarkan ke dashboard pusat & peta pemantauan warga secara live (interval 15 detik)."
                        : "Aktifkan sinyal agar admin kantor dan warga dapat memantau pergerakan truk penjemput sampah.",
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Indikator Posisi Terakhir
            if (pos != null) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Informasi Telemetri GPS Terkini",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 12),
                      _buildTelemetryRow("Latitude", pos.latitude.toStringAsFixed(6)),
                      _buildTelemetryRow("Longitude", pos.longitude.toStringAsFixed(6)),
                      _buildTelemetryRow("Akurasi Sinyal", "±${pos.accuracy.round()} meter"),
                      _buildTelemetryRow(
                        "Kecepatan Laju",
                        "${(pos.speed * 3.6).toStringAsFixed(1)} km/jam",
                      ),
                      _buildTelemetryRow(
                        "Arah (Heading)",
                        "${pos.heading.round()}°",
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            // Tombol Toggle
            if (!tracking.isTracking)
              CustomButton(
                text: "Mulai Pancarkan Posisi Truk",
                icon: Icons.play_arrow_rounded,
                onPressed: () async {
                  final ok = await tracking.startTracking();
                  if (!ok && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Gagal mengaktifkan GPS. Pastikan izin lokasi telah diberikan."),
                        backgroundColor: AppColors.danger,
                      ),
                    );
                  }
                },
              )
            else
              CustomButton(
                text: "Hentikan Pancaran Lokasi",
                icon: Icons.stop_rounded,
                backgroundColor: AppColors.danger,
                onPressed: () => tracking.stopTracking(),
              ),

            const SizedBox(height: 24),
            // Info Catatan Penggunaan
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: const Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, size: 20, color: AppColors.info),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Tips: Biarkan layar menyala atau gunakan holder HP di dashboard truk agar sinyal GPS tetap stabil selama bertugas.",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTelemetryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
          Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              fontFamily: 'monospace',
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
