import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/tugas_model.dart';
import '../../providers/pengangkutan_provider.dart';
import '../../widgets/task_card.dart';
import 'pengangkutan_detail_screen.dart';

class PengangkutanListScreen extends StatefulWidget {
  const PengangkutanListScreen({super.key});

  @override
  State<PengangkutanListScreen> createState() => _PengangkutanListScreenState();
}

class _PengangkutanListScreenState extends State<PengangkutanListScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _handleQuickPickup(TugasModel tugas) async {
    final provider = context.read<PengangkutanProvider>();
    Position? pos;
    try {
      pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 4),
      );
    } catch (_) {}

    final success = await provider.quickPickup(
      tugas.id,
      lat: pos?.latitude,
      lng: pos?.longitude,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✓ Pengambilan di ${tugas.pelanggan.nama} berhasil dicatat!"),
          backgroundColor: AppColors.success,
          duration: const Duration(seconds: 2),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.errorMessage ?? "Gagal mencatat pickup"),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  void _showLewatiDialog(TugasModel tugas) {
    String selectedStatus = 'tidak_diangkut';
    final alasanController = TextEditingController(text: 'Dilewati: Ada tunggakan iuran / Akses terhalang');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "Lewati: ${tugas.pelanggan.nama}",
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text("Pilih Alasan:", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  RadioGroup<String>(
                    groupValue: selectedStatus,
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          selectedStatus = val;
                          alasanController.text = val == "tidak_diangkut"
                              ? "Tidak Diangkut: Menunggak / Jalan Ditutup"
                              : "Rumah Kosong: Tidak ada sampah";
                        });
                      }
                    },
                    child: const Column(
                      children: [
                        RadioListTile<String>(
                          title: Text("Tidak Diangkut (Menunggak / Kendala Jalan)"),
                          value: "tidak_diangkut",
                        ),
                        RadioListTile<String>(
                          title: Text("Rumah Kosong (Tidak ada sampah di depan)"),
                          value: "kosong",
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: alasanController,
                    decoration: const InputDecoration(
                      labelText: "Catatan Tambahan",
                      hintText: "Tulis kendala lapangan...",
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      final success = await context.read<PengangkutanProvider>().lewatiRumah(
                        tugas.id,
                        selectedStatus,
                        alasanController.text,
                      );
                      if (mounted && success) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text("Status rumah berhasil diperbarui."),
                            backgroundColor: AppColors.warning,
                          ),
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.warning,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text("Konfirmasi Lewati"),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<PengangkutanProvider>();
    final list = provider.filteredList;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Tugas Pengangkutan"),
        actions: [
          if (!provider.isToday)
            TextButton.icon(
              onPressed: () => provider.setHariIni(),
              icon: const Icon(Icons.today_rounded, size: 16, color: Colors.white),
              label: const Text("Hari Ini", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Muat Ulang",
            onPressed: () => provider.loadTugas(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Date Selector Bar
          Container(
            color: AppColors.primarySurface,
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left_rounded, color: AppColors.primaryDark),
                  tooltip: "Hari Sebelumnya",
                  onPressed: () => provider.prevDay(),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () async {
                      final current = DateTime.tryParse(provider.currentDateISO) ?? DateTime.now();
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: current,
                        firstDate: DateTime(2025),
                        lastDate: DateTime(2030),
                      );
                      if (picked != null) {
                        provider.setTanggal(DateFormat('yyyy-MM-dd').format(picked));
                      }
                    },
                    borderRadius: BorderRadius.circular(10),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.calendar_today_rounded, size: 15, color: AppColors.primaryDark),
                          const SizedBox(width: 6),
                          Text(
                            provider.formattedDateTitle,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primaryDark,
                            ),
                          ),
                          if (provider.isToday) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: AppColors.primaryDark,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Text(
                                "Hari Ini",
                                style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right_rounded, color: AppColors.primaryDark),
                  tooltip: "Hari Berikutnya",
                  onPressed: () => provider.nextDay(),
                ),
              ],
            ),
          ),
          // Search & Filter Box
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              children: [
                // Search Input
                TextField(
                  controller: _searchController,
                  onChanged: (q) => provider.setSearchQuery(q),
                  decoration: InputDecoration(
                    hintText: "Cari nama warga, alamat, atau ID...",
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              provider.setSearchQuery('');
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                ),
                const SizedBox(height: 10),

                // Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip("semua", "Semua (${provider.totalTugas})", provider),
                      const SizedBox(width: 8),
                      _buildFilterChip("terjadwal", "Terjadwal (${provider.totalTerjadwal})", provider),
                      const SizedBox(width: 8),
                      _buildFilterChip("diambil", "Selesai (${provider.totalSelesai})", provider),
                      const SizedBox(width: 8),
                      _buildFilterChip("dilewati", "Dilewati (${provider.totalDilewati})", provider),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Task List
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.loadTugas(),
              child: provider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : list.isEmpty
                      ? ListView(
                          padding: const EdgeInsets.all(24),
                          children: [
                            const SizedBox(height: 40),
                            Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.inbox_outlined, size: 54, color: AppColors.textMuted),
                                  const SizedBox(height: 14),
                                  const Text(
                                    "Tidak ada tugas pengangkutan",
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    provider.isToday
                                        ? "Hari ini (${provider.formattedDateTitle}) belum ada penjemputan terjadwal atau hari standby armada."
                                        : "Tidak ada jadwal tugas penjemputan untuk tanggal ini.",
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                  ),
                                  const SizedBox(height: 20),
                                  Wrap(
                                    spacing: 10,
                                    runSpacing: 10,
                                    alignment: WrapAlignment.center,
                                    children: [
                                      ElevatedButton.icon(
                                        onPressed: () => provider.setBesok(),
                                        icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                                        label: Text("Lihat Tugas Besok (${provider.besokDayName})"),
                                      ),
                                      if (!provider.isToday)
                                        OutlinedButton.icon(
                                          onPressed: () => provider.setHariIni(),
                                          icon: const Icon(Icons.today_rounded, size: 18),
                                          label: const Text("Kembali ke Hari Ini"),
                                        ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: list.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (ctx, idx) {
                            final tugas = list[idx];
                            return TaskCard(
                              tugas: tugas,
                              index: idx,
                              onQuickPickup: () => _handleQuickPickup(tugas),
                              onDetailTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => PengangkutanDetailScreen(tugas: tugas),
                                ),
                              ),
                              onLewatiTap: (st, al) => _showLewatiDialog(tugas),
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String filterKey, String label, PengangkutanProvider provider) {
    final isSelected = provider.selectedFilter == filterKey;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) => provider.setFilter(filterKey),
      selectedColor: AppColors.primary,
      backgroundColor: AppColors.surfaceMuted,
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
        color: isSelected ? Colors.white : AppColors.textSecondary,
      ),
    );
  }
}
