import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/tugas_model.dart';
import '../../providers/pengangkutan_provider.dart';
import '../../services/pengangkutan_service.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/status_badge.dart';

class PengangkutanDetailScreen extends StatefulWidget {
  final TugasModel tugas;

  const PengangkutanDetailScreen({super.key, required this.tugas});

  @override
  State<PengangkutanDetailScreen> createState() => _PengangkutanDetailScreenState();
}

class _PengangkutanDetailScreenState extends State<PengangkutanDetailScreen> {
  late String _status;
  final _volumeController = TextEditingController();
  final _beratController = TextEditingController();
  final _catatanController = TextEditingController();
  String _jenisSampah = "campuran";
  XFile? _fotoBukti;
  bool _isLoading = false;
  final _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _status = widget.tugas.status;
    if (widget.tugas.volume != null) {
      _volumeController.text = widget.tugas.volume.toString();
    }
    if (widget.tugas.berat != null) {
      _beratController.text = widget.tugas.berat.toString();
    }
    if (widget.tugas.catatan != null) {
      _catatanController.text = widget.tugas.catatan!;
    }
    if (widget.tugas.jenisSampah != null) {
      _jenisSampah = widget.tugas.jenisSampah!;
    }
  }

  @override
  void dispose() {
    _volumeController.dispose();
    _beratController.dispose();
    _catatanController.dispose();
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
    setState(() => _isLoading = true);

    try {
      String? base64Foto;
      if (_fotoBukti != null) {
        final bytes = await File(_fotoBukti!.path).readAsBytes();
        base64Foto = "data:image/jpeg;base64,${base64Encode(bytes)}";
      }

      Position? pos;
      try {
        pos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 4),
        );
      } catch (_) {}

      await PengangkutanService.updateStatus(
        taskId: widget.tugas.id,
        status: _status,
        catatan: _catatanController.text.trim(),
        volume: double.tryParse(_volumeController.text),
        berat: double.tryParse(_beratController.text),
        jenisSampah: _jenisSampah,
        fotoBuktiBase64: base64Foto,
        latitude: pos?.latitude,
        longitude: pos?.longitude,
      );

      if (mounted) {
        await context.read<PengangkutanProvider>().loadTugas();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("✓ Berhasil memperbarui data pengangkutan!"),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Gagal: $e"), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.tugas.pelanggan;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Catat Pengangkutan"),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Info Pelanggan Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          p.nama,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                        ),
                        StatusBadge(status: _status),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text("ID Pelanggan: ${p.kodePelanggan}", style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    const SizedBox(height: 8),
                    Text(p.alamat, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                    if (p.patokanLokasi != null) ...[
                      const SizedBox(height: 4),
                      Text("Patokan: ${p.patokanLokasi}", style: const TextStyle(fontSize: 12, color: AppColors.primaryDark)),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Form Edit Pengangkutan
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Status Pengambilan", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _status,
                      decoration: const InputDecoration(),
                      items: const [
                        DropdownMenuItem(value: "diambil", child: Text("Diambil (Selesai)")),
                        DropdownMenuItem(value: "terjadwal", child: Text("Terjadwal (Belum Selesai)")),
                        DropdownMenuItem(value: "kosong", child: Text("Rumah Kosong")),
                        DropdownMenuItem(value: "tidak_diangkut", child: Text("Tidak Diangkut (Menunggak/Batal)")),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _status = val);
                      },
                    ),
                    const SizedBox(height: 16),

                    const Text("Jenis Sampah", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      initialValue: _jenisSampah,
                      decoration: const InputDecoration(),
                      items: const [
                        DropdownMenuItem(value: "campuran", child: Text("Campuran")),
                        DropdownMenuItem(value: "organik", child: Text("Organik")),
                        DropdownMenuItem(value: "anorganik", child: Text("Anorganik")),
                        DropdownMenuItem(value: "b3", child: Text("B3")),
                      ],
                      onChanged: (val) {
                        if (val != null) setState(() => _jenisSampah = val);
                      },
                    ),
                    const SizedBox(height: 16),

                    Row(
                      children: [
                        Expanded(
                          child: CustomTextField(
                            controller: _volumeController,
                            label: "Volume (m³)",
                            hint: "0.2",
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: CustomTextField(
                            controller: _beratController,
                            label: "Berat (kg)",
                            hint: "5.0",
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    CustomTextField(
                      controller: _catatanController,
                      label: "Catatan Kendala",
                      hint: "Contoh: Tong sampah penuh, diangkut 2 karung",
                      maxLines: 2,
                    ),
                    const SizedBox(height: 20),

                    // Foto Bukti Pengambilan
                    const Text("Foto Bukti Pengambilan (Opsional)", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    if (_fotoBukti != null) ...[
                      ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: Image.file(
                          File(_fotoBukti!.path),
                          height: 160,
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
                        label: const Text("Ambil Foto Bukti"),
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
              text: "Simpan Laporan Pengangkutan",
              isLoading: _isLoading,
              onPressed: _handleSubmit,
            ),
          ],
        ),
      ),
    );
  }
}
