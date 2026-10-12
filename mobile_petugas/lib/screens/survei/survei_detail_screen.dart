import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/calon_pelanggan_model.dart';
import '../../providers/survei_provider.dart';
import '../../services/tracking_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class SurveiDetailScreen extends StatefulWidget {
  final CalonPelangganModel calon;

  const SurveiDetailScreen({super.key, required this.calon});

  @override
  State<SurveiDetailScreen> createState() => _SurveiDetailScreenState();
}

class _SurveiDetailScreenState extends State<SurveiDetailScreen> {
  final _patokanController = TextEditingController();
  final _tarifController = TextEditingController();
  String _kategori = "rumah_tangga";
  XFile? _fotoRumah;
  Position? _capturedPosition;
  bool _isGettingLocation = false;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    if (widget.calon.patokanLokasi != null) {
      _patokanController.text = widget.calon.patokanLokasi!;
    }
    if (widget.calon.kategori != null) {
      _kategori = widget.calon.kategori!;
    }
    _fetchGpsLocation();
  }

  @override
  void dispose() {
    _patokanController.dispose();
    _tarifController.dispose();
    super.dispose();
  }

  Future<void> _fetchGpsLocation() async {
    setState(() => _isGettingLocation = true);
    try {
      final hasPerm = await TrackingService.checkAndRequestPermission();
      if (hasPerm) {
        final pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10),
        );
        setState(() => _capturedPosition = pos);
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _isGettingLocation = false);
    }
  }

  Future<void> _takeHousePhoto() async {
    try {
      final img = await _picker.pickImage(
        source: ImageSource.camera,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 75,
      );
      if (img != null) {
        setState(() => _fotoRumah = img);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Gagal membuka kamera: $e")),
      );
    }
  }

  Future<void> _handleSubmit() async {
    if (_fotoRumah == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Foto depan rumah wajib diambil sebagai bukti survei fisik"),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    final provider = context.read<SurveiProvider>();
    final success = await provider.submitSurvei(
      id: widget.calon.id,
      fotoFile: _fotoRumah!,
      patokanLokasi: _patokanController.text.trim(),
      kategori: _kategori,
      customTarif: _tarifController.text.isNotEmpty ? _tarifController.text.trim() : null,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("✓ Calon pelanggan berhasil diverifikasi & diaktifkan!"),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? "Gagal menyimpan hasil survei"),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SurveiProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Form Survei Geotag Warga"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Calon
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.calon.nama,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.calon.alamat,
                      style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                    ),
                    if (widget.calon.noTelepon != null) ...[
                      const SizedBox(height: 4),
                      Text("HP: ${widget.calon.noTelepon}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Kunci Koordinat GPS Geotag
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.my_location_rounded, size: 18, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text("Koordinat GPS Rumah", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                          ],
                        ),
                        if (_isGettingLocation)
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        else
                          IconButton(
                            onPressed: _fetchGpsLocation,
                            icon: const Icon(Icons.refresh_rounded, size: 20),
                            tooltip: "Ambil Ulang GPS",
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_capturedPosition != null) ...[
                      Text(
                        "Latitude: ${_capturedPosition!.latitude.toStringAsFixed(6)}\nLongitude: ${_capturedPosition!.longitude.toStringAsFixed(6)} (Akurasi: ±${_capturedPosition!.accuracy.round()}m)",
                        style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: AppColors.textPrimary),
                      ),
                    ] else ...[
                      const Text(
                        "Menunggu pembacaan sensor GPS perangkat...",
                        style: TextStyle(fontSize: 12, color: AppColors.warning),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Foto Depan Rumah
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text("Foto Depan Rumah / Pagar (Wajib)", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    const Text("Foto ini akan tampil di peta operasional kru truk", style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    const SizedBox(height: 14),

                    if (_fotoRumah != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          File(_fotoRumah!.path),
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton.icon(
                        onPressed: _takeHousePhoto,
                        icon: const Icon(Icons.refresh_rounded, size: 16),
                        label: const Text("Ambil Ulang Foto"),
                      ),
                    ] else ...[
                      OutlinedButton.icon(
                        onPressed: _takeHousePhoto,
                        icon: const Icon(Icons.camera_alt_outlined),
                        label: const Text("Buka Kamera & Foto Rumah"),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 50),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Form Data Tambahan
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CustomTextField(
                      controller: _patokanController,
                      label: "Patokan Lokasi Rumah",
                      hint: "mis. Depan warung Madura, pagar hijau RT 02",
                    ),
                    const SizedBox(height: 16),

                    const Text("Kategori Layanan", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      initialValue: _kategori,
                      items: const [
                        DropdownMenuItem(value: "rumah_tangga", child: Text("Rumah Tangga")),
                        DropdownMenuItem(value: "bisnis", child: Text("Bisnis / Toko")),
                        DropdownMenuItem(value: "kost", child: Text("Rumah Kost")),
                        DropdownMenuItem(value: "rm_makan", child: Text("Rumah Makan / Kuliner")),
                        DropdownMenuItem(value: "sekolah", child: Text("Sekolah / Yayasan")),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _kategori = val);
                      },
                    ),
                    const SizedBox(height: 16),

                    CustomTextField(
                      controller: _tarifController,
                      label: "Override Tarif Bulanan (Opsional)",
                      hint: "Kosongkan jika menggunakan tarif standar kategori",
                      keyboardType: TextInputType.number,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            CustomButton(
              text: "Konfirmasi & Aktifkan Pelanggan",
              icon: Icons.check_circle_rounded,
              isLoading: provider.isLoading,
              onPressed: _handleSubmit,
            ),
          ],
        ),
      ),
    );
  }
}
