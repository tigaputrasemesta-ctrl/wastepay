import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/pelanggan_model.dart';
import '../../providers/admin_provider.dart';

class AdminPelangganScreen extends StatefulWidget {
  const AdminPelangganScreen({super.key});

  @override
  State<AdminPelangganScreen> createState() => _AdminPelangganScreenState();
}

class _AdminPelangganScreenState extends State<AdminPelangganScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _openWhatsApp(String phone, String name) async {
    var cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62${cleanPhone.substring(1)}';
    }
    final uri = Uri.parse("https://wa.me/$cleanPhone?text=Halo%20Bapak/Ibu%20$name,%20kami%20dari%20Layanan%20UPS%20HERU%20Depok.");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callPhone(String phone) async {
    final uri = Uri.parse("tel:$phone");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openMap(double lat, double lng) async {
    final uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=$lat,$lng");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final list = admin.displayedPelanggan;

    return Scaffold(
      backgroundColor: const Color(0xFF0B1120),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          "Kelola Pelanggan (Offline HP)",
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded, color: Color(0xFF38BDF8)),
            tooltip: "Sinkronkan Perubahan",
            onPressed: () => admin.syncDelta(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Column(
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  onChanged: (val) => admin.setSearchQuery(val),
                  decoration: InputDecoration(
                    hintText: "Cari nama, kode pelanggan, alamat, telp...",
                    hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                    prefixIcon: const Icon(Icons.search_rounded, color: Colors.white54, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, color: Colors.white54, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              admin.setSearchQuery("");
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                // Status Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip("semua", "Semua (${admin.totalCached})", admin),
                      const SizedBox(width: 6),
                      _buildFilterChip("aktif", "Aktif (${admin.countAktif})", admin),
                      const SizedBox(width: 6),
                      _buildFilterChip("calon", "Calon (${admin.countCalon})", admin),
                      const SizedBox(width: 6),
                      _buildFilterChip("nonaktif", "Nonaktif (${admin.countNonaktif})", admin),
                      const SizedBox(width: 6),
                      _buildFilterChip("libur", "Libur (${admin.countLibur})", admin),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Customer Count Subheader
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF0B1120),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Menampilkan ${list.length} warga dari memori HP",
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
                const Row(
                  children: [
                    Icon(Icons.bolt_rounded, color: Color(0xFF4ADE80), size: 14),
                    SizedBox(width: 2),
                    Text(
                      "Pencarian 0ms",
                      style: TextStyle(color: Color(0xFF4ADE80), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Customer List
          Expanded(
            child: list.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.person_off_rounded, color: Colors.white38, size: 48),
                        const SizedBox(height: 12),
                        const Text(
                          "Tidak ada pelanggan ditemukan",
                          style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          "Coba ganti kata kunci pencarian atau filter status",
                          style: TextStyle(color: Colors.white38, fontSize: 12),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    itemCount: list.length,
                    itemBuilder: (ctx, idx) {
                      final p = list[idx];
                      return _buildCustomerCard(p);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, AdminProvider admin) {
    final isSelected = admin.selectedStatus == value;
    return GestureDetector(
      onTap: () => admin.setSelectedStatus(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0284C7) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF38BDF8) : const Color(0xFF334155),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildCustomerCard(PelangganModel p) {
    Color statusColor;
    switch (p.status.toLowerCase()) {
      case 'aktif':
        statusColor = const Color(0xFF00AA13);
        break;
      case 'calon':
        statusColor = const Color(0xFFF59E0B);
        break;
      case 'libur':
        statusColor = const Color(0xFF64748B);
        break;
      default:
        statusColor = const Color(0xFFEF4444);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Nama, Kode, Status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      p.nama,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      p.kodePelanggan,
                      style: const TextStyle(
                        color: Color(0xFF38BDF8),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor),
                ),
                child: Text(
                  p.status.toUpperCase(),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Alamat & RT/RW
          Text(
            p.alamat,
            style: const TextStyle(color: Colors.white70, fontSize: 12),
          ),

          if (p.patokanLokasi != null && p.patokanLokasi!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              "Patokan: ${p.patokanLokasi}",
              style: const TextStyle(color: Colors.white54, fontSize: 11, fontStyle: FontStyle.italic),
            ),
          ],

          const SizedBox(height: 8),

          // Badges: Zona & Wilayah
          Wrap(
            spacing: 6,
            runSpacing: 4,
            children: [
              if (p.zonaNama != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF475569)),
                  ),
                  child: Text(
                    "Zona: ${p.zonaNama}",
                    style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
              if (p.wilayahNama != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    p.wilayahNama!,
                    style: const TextStyle(color: Colors.white70, fontSize: 10),
                  ),
                ),
              if (p.rtRw != null && p.rtRw!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    "RT/RW: ${p.rtRw}",
                    style: const TextStyle(color: Colors.white70, fontSize: 10),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 12),
          const Divider(color: Color(0xFF334155), height: 1),
          const SizedBox(height: 8),

          // 1-Tap Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                p.noTelepon,
                style: const TextStyle(color: Colors.white60, fontSize: 11, fontFamily: 'monospace'),
              ),
              Row(
                children: [
                  if (p.hasCoordinates) ...[
                    IconButton(
                      icon: const Icon(Icons.location_on_rounded, color: Color(0xFF38BDF8), size: 20),
                      tooltip: "Lihat di Peta",
                      constraints: const BoxConstraints(),
                      padding: const EdgeInsets.all(6),
                      onPressed: () => _openMap(p.latitude!, p.longitude!),
                    ),
                    const SizedBox(width: 8),
                  ],
                  IconButton(
                    icon: const Icon(Icons.phone_rounded, color: Colors.lightBlueAccent, size: 20),
                    tooltip: "Telepon",
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(6),
                    onPressed: () => _callPhone(p.noTelepon),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF25D366), size: 20),
                    tooltip: "Chat WhatsApp",
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(6),
                    onPressed: () => _openWhatsApp(p.noTelepon, p.nama),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}
