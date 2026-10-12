import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../core/network/api_client.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class LaporKendalaScreen extends StatefulWidget {
  const LaporKendalaScreen({super.key});

  @override
  State<LaporKendalaScreen> createState() => _LaporKendalaScreenState();
}

class _LaporKendalaScreenState extends State<LaporKendalaScreen> {
  String _jenisKendala = "akses_tertutup";
  final _deskripsiController = TextEditingController();
  XFile? _fotoBukti;
  bool _isLoading = false;
  final _picker = ImagePicker();

  @override
  void dispose() {
    _deskripsiController.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    try {
      final img = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 75,
      );
      if (img != null) {
        setState(() => _fotoBukti = img);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Gagal membuka kamera: $e")),
      );
    }
  }

  Future<void> _handleSubmit() async {
    final deskripsi = _deskripsiController.text.trim();
    if (deskripsi.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Harap tuliskan deskripsi kendala")),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      String? base64Foto;
      if (_fotoBukti != null) {
        final bytes = await File(_fotoBukti!.path).readAsBytes();
        base64Foto = "data:image/jpeg;base64,${base64Encode(bytes)}";
      }

      await ApiClient.post(
        ApiEndpoints.komplain,
        body: {
          'jenis': _jenisKendala,
          'deskripsi': deskripsi,
          if (base64Foto != null) 'foto': base64Foto,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("✓ Laporan kendala berhasil dikirimkan ke admin kantor"),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Gagal mengirim laporan: $e"), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Lapor Kendala Lapangan"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Jenis Kendala Lapangan", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _jenisKendala,
                      items: const [
                        DropdownMenuItem(value: "akses_tertutup", child: Text("Akses Jalan Ditutup / Portal")),
                        DropdownMenuItem(value: "sampah_menumpuk", child: Text("Sampah Liar Menumpuk Ekstrem")),
                        DropdownMenuItem(value: "kendaraan_rusak", child: Text("Kendaraan / Truk Mogok")),
                        DropdownMenuItem(value: "cuaca_banjir", child: Text("Cuaca Ekstrem / Banjir")),
                        DropdownMenuItem(value: "lainnya", child: Text("Kendala Lapangan Lainnya")),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _jenisKendala = val);
                      },
                    ),
                    const SizedBox(height: 16),

                    CustomTextField(
                      controller: _deskripsiController,
                      label: "Deskripsi Situasi",
                      hint: "Jelaskan kendala yang dialami secara rinci...",
                      maxLines: 4,
                    ),
                    const SizedBox(height: 20),

                    const Text("Foto Bukti Kejadian (Opsional)", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    if (_fotoBukti != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          File(_fotoBukti!.path),
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: _takePhoto,
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text("Ambil Ulang Foto"),
                      ),
                    ] else ...[
                      OutlinedButton.icon(
                        onPressed: _takePhoto,
                        icon: const Icon(Icons.camera_alt_outlined),
                        label: const Text("Foto Bukti Kendala"),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 48),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            CustomButton(
              text: "Kirim Laporan Darurat",
              icon: Icons.send_rounded,
              backgroundColor: AppColors.danger,
              isLoading: _isLoading,
              onPressed: _handleSubmit,
            ),
          ],
        ),
      ),
    );
  }
}
