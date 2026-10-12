import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/absensi_provider.dart';
import '../../widgets/custom_button.dart';

class AbsensiScreen extends StatefulWidget {
  const AbsensiScreen({super.key});

  @override
  State<AbsensiScreen> createState() => _AbsensiScreenState();
}

class _AbsensiScreenState extends State<AbsensiScreen> {
  final _picker = ImagePicker();
  XFile? _capturedImage;
  String? _catatan;

  Future<void> _takeSelfie() async {
    try {
      final photo = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 75,
      );
      if (photo != null) {
        setState(() {
          _capturedImage = photo;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Gagal membuka kamera: $e"), backgroundColor: AppColors.danger),
      );
    }
  }

  Future<void> _submitAbsen(String tipe) async {
    if (_capturedImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Wajib mengambil foto selfie sebagai bukti kehadiran"),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    final provider = context.read<AbsensiProvider>();
    final success = await provider.submitAbsen(
      tipe: tipe,
      fotoFile: _capturedImage!,
      catatan: _catatan,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✓ Absensi ${tipe == 'masuk' ? 'Masuk' : 'Pulang'} berhasil dicatat!"),
          backgroundColor: AppColors.success,
        ),
      );
      setState(() {
        _capturedImage = null;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? "Gagal mencatat absensi"),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final absensi = context.watch<AbsensiProvider>();
    final status = absensi.absensiHariIni;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Absensi Kru Lapangan"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card Saat Ini
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Status Absensi Hari Ini",
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _buildStatusBox(
                            title: "Jam Masuk",
                            time: status?.waktuMasuk ?? "-",
                            isDone: status?.sudahMasuk == true,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildStatusBox(
                            title: "Jam Pulang",
                            time: status?.waktuSelesai ?? "-",
                            isDone: status?.sudahSelesai == true,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Foto Selfie Kamera
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      "Foto Selfie Kehadiran",
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      "Ambil foto wajah Anda langsung di lokasi operasional",
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                    ),
                    const SizedBox(height: 16),

                    if (_capturedImage != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.file(
                          File(_capturedImage!.path),
                          height: 220,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: _takeSelfie,
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text("Ambil Ulang Foto"),
                      ),
                    ] else ...[
                      GestureDetector(
                        onTap: _takeSelfie,
                        child: Container(
                          height: 160,
                          decoration: BoxDecoration(
                            color: AppColors.surfaceMuted,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                          ),
                          child: const Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.camera_alt_outlined, size: 40, color: AppColors.primary),
                              SizedBox(height: 8),
                              Text(
                                "Ketuk untuk Buka Kamera",
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primaryDark,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Tombol Aksi Absen
            if (status?.sudahMasuk != true) ...[
              CustomButton(
                text: "Absen Masuk Sekarang",
                icon: Icons.login_rounded,
                isLoading: absensi.isLoading,
                onPressed: () => _submitAbsen("masuk"),
              ),
            ] else if (status?.sudahSelesai != true) ...[
              CustomButton(
                text: "Absen Pulang (Selesai Tugas)",
                icon: Icons.logout_rounded,
                backgroundColor: AppColors.warning,
                isLoading: absensi.isLoading,
                onPressed: () => _submitAbsen("selesai"),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.successBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_rounded, color: AppColors.success, size: 20),
                    SizedBox(width: 8),
                    Text(
                      "Absensi hari ini telah lengkap (Masuk & Pulang)",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.success,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBox({required String title, required String time, required bool isDone}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDone ? AppColors.successBg : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text(
            time,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: isDone ? AppColors.success : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
