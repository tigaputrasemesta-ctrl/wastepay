import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../models/komplain_model.dart';
import '../../services/driver_actions_service.dart';
import '../../services/external_navigation_service.dart';
import '../../services/komplain_service.dart';

class KeluhanPelangganScreen extends StatefulWidget {
  const KeluhanPelangganScreen({super.key});

  @override
  State<KeluhanPelangganScreen> createState() => _KeluhanPelangganScreenState();
}

class _KeluhanPelangganScreenState extends State<KeluhanPelangganScreen> {
  List<KomplainModel> _list = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedFilter = 'semua'; // 'semua', 'baru', 'proses', 'selesai'
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadKomplain();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadKomplain() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = await KomplainService.getKomplainList(status: _selectedFilter);
      if (mounted) {
        setState(() {
          _list = items;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  List<KomplainModel> get _filteredList {
    if (_searchQuery.trim().isEmpty) return _list;
    final q = _searchQuery.toLowerCase();
    return _list.where((item) {
      final matchNama = item.pelanggan.nama.toLowerCase().contains(q);
      final matchKode = item.pelanggan.kodePelanggan.toLowerCase().contains(q);
      final matchAlamat = item.pelanggan.alamat.toLowerCase().contains(q);
      final matchDeskripsi = item.deskripsi.toLowerCase().contains(q);
      final matchZona = item.pelanggan.zonaNama?.toLowerCase().contains(q) ?? false;
      return matchNama || matchKode || matchAlamat || matchDeskripsi || matchZona;
    }).toList();
  }

  void _showFotoDetail(String fotoStr, String namaPelanggan) {
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
                          "📸 Foto Bukti Pengaduan",
                          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          "Pelapor: $namaPelanggan",
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
          fit: BoxFit.contain,
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
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _buildPlaceholderPhoto(),
      );
    }
    return _buildPlaceholderPhoto();
  }

  Widget _buildPlaceholderPhoto() {
    return Container(
      height: 140,
      color: Colors.white10,
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.broken_image_rounded, color: Colors.white38, size: 36),
            SizedBox(height: 6),
            Text("Format foto tidak dapat ditampilkan", style: TextStyle(color: Colors.white38, fontSize: 11)),
          ],
        ),
      ),
    );
  }

  void _showTanggapiModal(KomplainModel item) {
    String selectedStatus = item.status == 'baru' ? 'proses' : 'selesai';
    final tanggapanController = TextEditingController(
      text: item.tanggapan ?? "Petugas kebersihan UPS HERU telah menindaklanjuti lokasi ini.",
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Tindak Lanjut Keluhan",
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                "Warga: ${item.pelanggan.nama} (${item.pelanggan.kodePelanggan})",
                style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 16),
              const Text("Pilih Status Penanganan:", style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text("Diproses")),
                      selected: selectedStatus == 'proses',
                      selectedColor: const Color(0xFF0284C7),
                      backgroundColor: Colors.white10,
                      labelStyle: TextStyle(
                        color: selectedStatus == 'proses' ? Colors.white : Colors.white60,
                        fontWeight: FontWeight.bold,
                      ),
                      onSelected: (_) => setModalState(() => selectedStatus = 'proses'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text("Selesai Ditangani")),
                      selected: selectedStatus == 'selesai',
                      selectedColor: const Color(0xFF059669),
                      backgroundColor: Colors.white10,
                      labelStyle: TextStyle(
                        color: selectedStatus == 'selesai' ? Colors.white : Colors.white60,
                        fontWeight: FontWeight.bold,
                      ),
                      onSelected: (_) => setModalState(() => selectedStatus = 'selesai'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text("Catatan / Tanggapan Petugas:", style: TextStyle(color: Colors.white70, fontSize: 12)),
              const SizedBox(height: 6),
              TextField(
                controller: tanggapanController,
                maxLines: 3,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white.withValues(alpha: 0.05),
                  hintText: "Tuliskan keterangan penanganan untuk warga...",
                  hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00AA13),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () async {
                  Navigator.pop(ctx);
                  try {
                    await KomplainService.updateStatus(
                      item.id,
                      status: selectedStatus,
                      tanggapan: tanggapanController.text.trim(),
                    );
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text("✓ Berhasil memperbarui status keluhan warga!"),
                          backgroundColor: Color(0xFF00AA13),
                        ),
                      );
                      _loadKomplain();
                    }
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Gagal mengupdate: $e"), backgroundColor: Colors.red),
                      );
                    }
                  }
                },
                child: const Text("Simpan & Kirim Notifikasi", style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTanggal(String raw) {
    try {
      final dt = DateTime.parse(raw).toLocal();
      return DateFormat('dd MMM yyyy, HH:mm').format(dt);
    } catch (_) {
      return raw;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        title: const Text(
          "Keluhan Pelanggan",
          style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: "Muat Ulang",
            onPressed: _loadKomplain,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Status Bar
          Container(
            color: const Color(0xFF1E293B),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('semua', 'Semua'),
                  const SizedBox(width: 8),
                  _buildFilterChip('baru', 'Perlu Ditangani (Baru)'),
                  const SizedBox(width: 8),
                  _buildFilterChip('proses', 'Sedang Diproses'),
                  const SizedBox(width: 8),
                  _buildFilterChip('selesai', 'Selesai Ditangani'),
                ],
              ),
            ),
          ),

          // Search Field
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _searchController,
              onChanged: (val) => setState(() => _searchQuery = val),
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1E293B),
                prefixIcon: const Icon(Icons.search_rounded, color: Colors.white60, size: 20),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, color: Colors.white60, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                hintText: "Cari nama, alamat, kode, atau zona...",
                hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Colors.white12),
                ),
              ),
            ),
          ),

          // Content List
          Expanded(
            child: _isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00AA13)),
                    ),
                  )
                : _errorMessage != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.error_outline_rounded, color: Colors.redAccent, size: 40),
                              const SizedBox(height: 10),
                              Text(
                                "Gagal memuat pengaduan: $_errorMessage",
                                style: const TextStyle(color: Colors.white70, fontSize: 13),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 14),
                              ElevatedButton(
                                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00AA13)),
                                onPressed: _loadKomplain,
                                child: const Text("Coba Lagi", style: TextStyle(color: Colors.white)),
                              ),
                            ],
                          ),
                        ),
                      )
                    : _filteredList.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF00AA13), size: 48),
                                const SizedBox(height: 12),
                                Text(
                                  _selectedFilter == 'baru'
                                      ? "Tidak ada keluhan baru yang perlu ditangani. Aman!"
                                      : "Tidak ada data pengaduan yang cocok.",
                                  style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(14, 4, 14, 20),
                            itemCount: _filteredList.length,
                            separatorBuilder: (_, __) => const SizedBox(height: 12),
                            itemBuilder: (ctx, idx) => _buildKomplainCard(_filteredList[idx]),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label) {
    final isSelected = _selectedFilter == key;
    return GestureDetector(
      onTap: () {
        setState(() => _selectedFilter = key);
        _loadKomplain();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF00AA13) : Colors.white10,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF00AA13) : Colors.white24,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildKomplainCard(KomplainModel item) {
    Color statusColor;
    String statusLabel;
    switch (item.status) {
      case 'baru':
        statusColor = const Color(0xFFEF4444); // Red
        statusLabel = 'BARU';
        break;
      case 'proses':
      case 'diproses':
        statusColor = const Color(0xFF38BDF8); // Cyan
        statusLabel = 'DIPROSES';
        break;
      case 'selesai':
        statusColor = const Color(0xFF10B981); // Emerald Green
        statusLabel = 'SELESAI';
        break;
      default:
        statusColor = Colors.grey;
        statusLabel = item.status.toUpperCase();
    }

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: item.isBaru ? const Color(0xFFEF4444).withValues(alpha: 0.5) : Colors.white12,
          width: item.isBaru ? 1.5 : 1.0,
        ),
        boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 8, offset: Offset(0, 3))],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Status Badge, Jenis, Tanggal
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: statusColor, width: 1),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w900),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        item.labelJenis,
                        style: const TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                Text(
                  _formatTanggal(item.createdAt),
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Nama & Alamat Pelanggan
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.pelanggan.nama,
                        style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        "ID: ${item.pelanggan.kodePelanggan}",
                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.location_on_outlined, color: Colors.white54, size: 14),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              item.pelanggan.alamat,
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                      if (item.pelanggan.zonaNama != null) ...[
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF6366F1), width: 0.8),
                          ),
                          child: Text(
                            "📍 Zona: ${item.pelanggan.zonaNama}",
                            style: const TextStyle(color: Color(0xFFA5B4FC), fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Thumbnail Foto Bukti Jika Ada
                if (item.foto != null && item.foto!.isNotEmpty)
                  GestureDetector(
                    onTap: () => _showFotoDetail(item.foto!, item.pelanggan.nama),
                    child: Container(
                      width: 68,
                      height: 68,
                      margin: const EdgeInsets.only(left: 10),
                      decoration: BoxDecoration(
                        color: Colors.white10,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white30, width: 1.2),
                        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 4)],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(11),
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            _buildImageWidget(item.foto!),
                            Positioned(
                              right: 2,
                              bottom: 2,
                              child: Container(
                                padding: const EdgeInsets.all(2),
                                decoration: BoxDecoration(
                                  color: Colors.black.withValues(alpha: 0.6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.zoom_in_rounded, color: Colors.white, size: 14),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Isi Pengaduan Warga
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Pesan Keluhan:",
                    style: TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.deskripsi,
                    style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.3),
                  ),
                  if (item.tanggapan != null && item.tanggapan!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    const Divider(color: Colors.white10, height: 1),
                    const SizedBox(height: 6),
                    Text(
                      "Tanggapan: ${item.tanggapan}",
                      style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Tombol Aksi Cepat
            Row(
              children: [
                // Tombol Buka Navigasi
                if (item.pelanggan.hasCoordinates) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF38BDF8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.navigation_rounded, color: Color(0xFF38BDF8), size: 16),
                      label: const Text("Navigasi", style: TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        ExternalNavigationService.openGoogleMaps(
                          item.pelanggan.latitude!,
                          item.pelanggan.longitude!,
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                ],

                // Tombol WhatsApp
                if (item.pelanggan.noTelepon != null && item.pelanggan.noTelepon!.isNotEmpty) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF25D366)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF25D366), size: 16),
                      label: const Text("WhatsApp", style: TextStyle(color: Color(0xFF25D366), fontSize: 12, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        DriverActionsService.openCustomWhatsApp(
                          phone: item.pelanggan.noTelepon,
                          message: "Halo Bpk/Ibu ${item.pelanggan.nama}, kami petugas kebersihan UPS HERU menindaklanjuti keluhan '${item.labelJenis}' Anda.",
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                ],

                // Tombol Tanggapi / Selesaikan
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: item.isSelesai ? Colors.white12 : const Color(0xFF00AA13),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => _showTanggapiModal(item),
                    child: Text(
                      item.isSelesai ? "Ubah" : "Tindak Lanjut",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
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
