import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/app_colors.dart';
import '../models/tugas_model.dart';
import '../screens/map/peta_driver_screen.dart';
import 'status_badge.dart';

class TaskCard extends StatelessWidget {
  final TugasModel tugas;
  final int? index;
  final VoidCallback onQuickPickup;
  final VoidCallback onDetailTap;
  final void Function(String status, String alasan) onLewatiTap;

  const TaskCard({
    super.key,
    required this.tugas,
    this.index,
    required this.onQuickPickup,
    required this.onDetailTap,
    required this.onLewatiTap,
  });

  Future<void> _callPhone() async {
    final telp = tugas.pelanggan.noTelepon;
    if (telp == null || telp.isEmpty) return;
    final uri = Uri.parse("tel:$telp");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = tugas.pelanggan;
    final tunggakan = tugas.tunggakan;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Nama, Kode, Status
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          if (tugas.urutan != null || index != null) ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                              margin: const EdgeInsets.only(right: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF00AA13), // Gojek green
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
                            child: Text(
                              p.nama,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "ID: ${p.kodePelanggan}",
                        style: const TextStyle(
                          fontSize: 12,
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

            // Peringatan Menunggak
            if (tunggakan.isMenunggak) ...[
              const SizedBox(height: 10),
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
            // Alamat & Patokan
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    p.alamat,
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),

            if (p.patokanLokasi != null && p.patokanLokasi!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      "Patokan: ${p.patokanLokasi}",
                      style: const TextStyle(fontSize: 12, color: AppColors.primaryDark, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 14),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 12),

            // Tombol Aksi
            Row(
              children: [
                // Tombol Peta Navigasi Mandiri
                IconButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => PetaDriverScreen(
                          initialTargetPelangganId: tugas.pelanggan.id,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.map_rounded, color: AppColors.info, size: 20),
                  tooltip: "Buka Peta Rute Driver Mandiri",
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.infoBg,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(width: 8),

                // Tombol Telpon
                if (p.noTelepon != null && p.noTelepon!.isNotEmpty) ...[
                  IconButton(
                    onPressed: _callPhone,
                    icon: const Icon(Icons.phone_outlined, color: AppColors.primaryDark, size: 20),
                    tooltip: "Hubungi Pelanggan",
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.primarySurface,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],

                // Tombol Detail
                OutlinedButton(
                  onPressed: onDetailTap,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                  child: const Text("Detail", style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                ),

                const Spacer(),

                // Tombol Cepat Selesai (Jika belum diambil)
                if (tugas.isTerjadwal)
                  ElevatedButton.icon(
                    onPressed: onQuickPickup,
                    icon: const Icon(Icons.check_circle_outline, size: 18),
                    label: const Text("1-Tap Ambil", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  )
                else
                  Text(
                    tugas.status == 'diambil' ? "✓ Telah Diambil" : "Dilewati",
                    style: TextStyle(
                      fontSize: 13,
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
