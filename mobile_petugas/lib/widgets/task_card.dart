import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/app_colors.dart';
import '../models/tugas_model.dart';
import '../services/external_navigation_service.dart';
import 'status_badge.dart';

class TaskCard extends StatelessWidget {
  final TugasModel tugas;
  final int? index;
  final double? driverDistanceMeters;
  final VoidCallback onQuickPickup;
  final VoidCallback onDetailTap;
  final void Function(String status, String alasan) onLewatiTap;
  final VoidCallback? onSelectAsTarget;

  const TaskCard({
    super.key,
    required this.tugas,
    this.index,
    this.driverDistanceMeters,
    required this.onQuickPickup,
    required this.onDetailTap,
    required this.onLewatiTap,
    this.onSelectAsTarget,
  });

  Future<void> _callPhone() async {
    final telp = tugas.pelanggan.noTelepon;
    if (telp == null || telp.isEmpty) return;
    final uri = Uri.parse("tel:$telp");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  void _showFotoDetail(BuildContext context, String fotoStr, String namaPelanggan) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white24),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 48, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "🏠 Foto Rumah Pelanggan",
                          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
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
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                    child: InteractiveViewer(
                      panEnabled: true,
                      minScale: 0.8,
                      maxScale: 4.0,
                      child: _buildImageWidget(fotoStr, maxHeight: 360),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              padding: const EdgeInsets.all(12),
              icon: const Icon(Icons.close_rounded, color: Colors.white, size: 26),
              onPressed: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildImageWidget(String fotoStr, {double? maxHeight}) {
    if (fotoStr.startsWith('data:image')) {
      try {
        final commaIdx = fotoStr.indexOf(',');
        final base64Data = commaIdx != -1 ? fotoStr.substring(commaIdx + 1) : fotoStr;
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          height: maxHeight,
          width: double.infinity,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildPlaceholderPhoto(),
        );
      } catch (_) {
        return _buildPlaceholderPhoto();
      }
    } else if (fotoStr.startsWith('http')) {
      return Image.network(
        fotoStr,
        height: maxHeight,
        width: double.infinity,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _buildPlaceholderPhoto(),
      );
    }
    return _buildPlaceholderPhoto();
  }

  Widget _buildPlaceholderPhoto() {
    return Container(
      color: Colors.grey.shade200,
      child: const Center(
        child: Icon(Icons.home_rounded, color: AppColors.textMuted, size: 28),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = tugas.pelanggan;
    final tunggakan = tugas.tunggakan;
    final bool isWithin20m = driverDistanceMeters != null && driverDistanceMeters! <= 20.0;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: Urutan, Nama, Kode & Status
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (tugas.urutan != null || index != null) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00AA13),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      "#${tugas.urutan ?? (index! + 1)}",
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p.nama,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 1),
                      Text(
                        "ID: ${p.kodePelanggan}",
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                StatusBadge(status: tugas.status),
              ],
            ),

            const SizedBox(height: 10),

            // Row 2: Badges (Zona, RT/RW, Radius Geofence)
            Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                if (p.zonaNama != null && p.zonaNama!.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF6366F1).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFF6366F1).withValues(alpha: 0.4), width: 0.8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.map_outlined, size: 12, color: Color(0xFF4F46E5)),
                        const SizedBox(width: 4),
                        Text(
                          p.zonaNama!,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF4F46E5),
                          ),
                        ),
                      ],
                    ),
                  ),

                if (p.rtRw != null && p.rtRw!.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: Colors.grey.shade300, width: 0.8),
                    ),
                    child: Text(
                      "RT/RW: ${p.rtRw}",
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                  ),

                if (driverDistanceMeters != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
                    decoration: BoxDecoration(
                      color: isWithin20m ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: isWithin20m ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        width: 0.8,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isWithin20m ? Icons.check_circle_rounded : Icons.radar_rounded,
                          size: 12,
                          color: isWithin20m ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isWithin20m
                              ? "Radius OK (${driverDistanceMeters!.round()}m)"
                              : "${driverDistanceMeters!.round()}m dari HP",
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isWithin20m ? const Color(0xFF16A34A) : const Color(0xFFB45309),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),

            // Peringatan Menunggak
            if (tunggakan.isMenunggak) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.dangerBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.danger),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        "Menunggak ${tunggakan.jumlahBulan} Bulan — Perhatian sebelum pickup",
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.danger,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 10),

            // Row 3: Foto Rumah & Alamat Warga
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Thumbnail Foto Rumah
                GestureDetector(
                  onTap: () {
                    if (p.fotoRumah != null && p.fotoRumah!.isNotEmpty) {
                      _showFotoDetail(context, p.fotoRumah!, p.nama);
                    }
                  },
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.grey.shade300),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(9),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (p.fotoRumah != null && p.fotoRumah!.isNotEmpty)
                            _buildImageWidget(p.fotoRumah!)
                          else
                            _buildPlaceholderPhoto(),
                          if (p.fotoRumah != null && p.fotoRumah!.isNotEmpty)
                            Positioned(
                              right: 2,
                              bottom: 2,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.5),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.zoom_in, size: 12, color: Colors.white),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 10),

                // Alamat & Patokan
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_outlined, size: 14, color: AppColors.textMuted),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              p.alamat,
                              style: const TextStyle(fontSize: 12.5, color: AppColors.textSecondary),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      if (p.patokanLokasi != null && p.patokanLokasi!.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.info_outline, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                "Patokan: ${p.patokanLokasi}",
                                style: const TextStyle(fontSize: 11.5, color: AppColors.primaryDark, fontWeight: FontWeight.w600),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 10),

            // Row 4: Tombol Aksi
            Row(
              children: [
                // Tombol Navigasi Google Maps Langsung
                if (p.hasCoordinates) ...[
                  IconButton(
                    onPressed: () => ExternalNavigationService.openGoogleMaps(p.latitude!, p.longitude!),
                    icon: const Icon(Icons.navigation_rounded, color: Color(0xFF0284C7), size: 19),
                    tooltip: "Buka Google Maps Navigasi",
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFE0F2FE),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.all(8),
                    ),
                  ),
                  const SizedBox(width: 6),
                ],

                // Tombol Telpon / Hubungi
                if (p.noTelepon != null && p.noTelepon!.isNotEmpty) ...[
                  IconButton(
                    onPressed: _callPhone,
                    icon: const Icon(Icons.phone_outlined, color: AppColors.primaryDark, size: 19),
                    tooltip: "Hubungi Pelanggan",
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primarySurface,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.all(8),
                    ),
                  ),
                  const SizedBox(width: 6),
                ],

                // Tombol Detail Form
                OutlinedButton(
                  onPressed: onDetailTap,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  ),
                  child: const Text("Detail", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ),

                const Spacer(),

                // Tombol Pickup Selesai (Dengan Indikator Geofence 20 Meter)
                if (tugas.isTerjadwal)
                  ElevatedButton.icon(
                    onPressed: onQuickPickup,
                    icon: Icon(
                      isWithin20m ? Icons.check_circle_rounded : Icons.lock_outline_rounded,
                      size: 16,
                    ),
                    label: Text(
                      isWithin20m ? "Ambil" : "1-Tap",
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isWithin20m ? const Color(0xFF00AA13) : AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                  )
                else
                  Text(
                    tugas.status == 'diambil' ? "✓ Telah Diambil" : "Dilewati",
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: tugas.status == 'diambil' ? AppColors.success : AppColors.textMuted,
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
