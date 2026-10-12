import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/rute_provider.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';
import 'rute_detail_screen.dart';

class JadwalRuteScreen extends StatefulWidget {
  const JadwalRuteScreen({super.key});

  @override
  State<JadwalRuteScreen> createState() => _JadwalRuteScreenState();
}

class _JadwalRuteScreenState extends State<JadwalRuteScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RuteProvider>().loadRute();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<RuteProvider>();
    final filtered = provider.filteredRute;
    final todayName = RuteProvider.getNamaHariIni();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Jadwal & Rute Pengangkutan",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            Text(
              "Jalur operasional armada sampah",
              style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Muat Ulang",
            onPressed: () => provider.loadRute(),
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Filter Hari Horizontal Chips
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 10),
            child: SizedBox(
              height: 38,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: RuteProvider.daftarHari.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final hari = RuteProvider.daftarHari[index];
                  final isSelected = provider.selectedHari == hari;
                  final isToday = hari == 'Hari Ini' || (provider.selectedHari != 'Hari Ini' && hari == todayName);

                  return ChoiceChip(
                    label: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isToday && hari == 'Hari Ini') ...[
                          const Icon(Icons.today_rounded, size: 14, color: Colors.white),
                          const SizedBox(width: 4),
                        ],
                        Text(hari),
                      ],
                    ),
                    selected: isSelected,
                    selectedColor: AppColors.primaryDark,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                      fontSize: 12,
                    ),
                    backgroundColor: AppColors.surfaceMuted,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(
                        color: isSelected ? AppColors.primaryDark : AppColors.border,
                      ),
                    ),
                    onSelected: (selected) {
                      if (selected) {
                        provider.setSelectedHari(hari);
                      }
                    },
                  );
                },
              ),
            ),
          ),

          // 2. Search Bar
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: "Cari rute, kelurahan, atau zona...",
                hintStyle: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                prefixIcon: const Icon(Icons.search_rounded, size: 20, color: AppColors.textMuted),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded, size: 18),
                        onPressed: () {
                          _searchController.clear();
                          provider.setSearchQuery('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surfaceMuted,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (val) => provider.setSearchQuery(val),
            ),
          ),

          // 3. Info Bar Hari Ini
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: AppColors.primarySurface,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_month_outlined, size: 16, color: AppColors.primaryDark),
                    const SizedBox(width: 6),
                    Text(
                      provider.selectedHari == 'Semua'
                          ? "Menampilkan Semua Rute"
                          : provider.selectedHari == 'Hari Ini'
                              ? "Jadwal Hari Ini ($todayName)"
                              : "Jadwal Hari ${provider.selectedHari}",
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ],
                ),
                Text(
                  "${filtered.length} Rute",
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primaryDark,
                  ),
                ),
              ],
            ),
          ),

          // 4. List Rute
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => provider.loadRute(),
              child: provider.isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : provider.errorMessage != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.danger),
                                const SizedBox(height: 12),
                                Text(
                                  provider.errorMessage!,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                                ),
                                const SizedBox(height: 16),
                                Wrap(
                                  spacing: 10,
                                  runSpacing: 10,
                                  alignment: WrapAlignment.center,
                                  children: [
                                    ElevatedButton.icon(
                                      onPressed: () => provider.loadRute(),
                                      icon: const Icon(Icons.refresh_rounded, size: 18),
                                      label: const Text("Coba Lagi"),
                                    ),
                                    if (provider.errorMessage!.toLowerCase().contains('sesi') ||
                                        provider.errorMessage!.toLowerCase().contains('login') ||
                                        provider.errorMessage!.toLowerCase().contains('unauthorized'))
                                      OutlinedButton.icon(
                                        onPressed: () async {
                                          await AuthService.logout();
                                          if (context.mounted) {
                                            Navigator.of(context).pushAndRemoveUntil(
                                              MaterialPageRoute(builder: (_) => const LoginScreen()),
                                              (route) => false,
                                            );
                                          }
                                        },
                                        icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.danger),
                                        label: const Text("Login Ulang", style: TextStyle(color: AppColors.danger)),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        )
                      : filtered.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(
                                      Icons.alt_route_rounded,
                                      size: 54,
                                      color: AppColors.textMuted,
                                    ),
                                    const SizedBox(height: 14),
                                    Text(
                                      provider.selectedHari == 'Hari Ini'
                                          ? "Tidak ada jadwal rute untuk hari $todayName"
                                          : "Tidak ada rute ditemukan",
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      provider.allRute.isNotEmpty
                                          ? "Tersedia ${provider.allRute.length} rute di hari lain. Ketuk tombol di bawah untuk melihat."
                                          : "Belum ada rute pengangkutan yang terdaftar di sistem.",
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                    if (provider.selectedHari != 'Semua' && provider.allRute.isNotEmpty) ...[
                                      const SizedBox(height: 14),
                                      OutlinedButton.icon(
                                        onPressed: () => provider.setSelectedHari('Semua'),
                                        icon: const Icon(Icons.visibility_outlined, size: 16),
                                        label: Text("Lihat Semua Rute (${provider.allRute.length})"),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final rute = filtered[index];
                                final isTodayActive = rute.isOperasionalHari(todayName);

                                return Card(
                                  child: InkWell(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => RuteDetailScreen(ruteId: rute.id, initialRute: rute),
                                        ),
                                      );
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          // Baris Atas: Nama Rute & Status
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(10),
                                                decoration: BoxDecoration(
                                                  color: isTodayActive
                                                      ? AppColors.primarySurface
                                                      : AppColors.surfaceMuted,
                                                  borderRadius: BorderRadius.circular(12),
                                                ),
                                                child: Icon(
                                                  Icons.alt_route_rounded,
                                                  size: 22,
                                                  color: isTodayActive
                                                      ? AppColors.primaryDark
                                                      : AppColors.textSecondary,
                                                ),
                                              ),
                                              const SizedBox(width: 12),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      rute.nama,
                                                      style: const TextStyle(
                                                        fontSize: 15,
                                                        fontWeight: FontWeight.w700,
                                                        color: AppColors.textPrimary,
                                                      ),
                                                    ),
                                                    const SizedBox(height: 4),
                                                    Row(
                                                      children: [
                                                        if (rute.kelurahanNama != null) ...[
                                                          const Icon(Icons.location_on_outlined, size: 13, color: AppColors.textMuted),
                                                          const SizedBox(width: 3),
                                                          Text(
                                                            rute.kelurahanNama!,
                                                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                                          ),
                                                        ],
                                                        if (rute.zonaNama != null) ...[
                                                          const SizedBox(width: 8),
                                                          Text(
                                                            "• ${rute.zonaNama!}",
                                                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                                          ),
                                                        ],
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              if (isTodayActive)
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.successBg,
                                                    borderRadius: BorderRadius.circular(8),
                                                  ),
                                                  child: const Text(
                                                    "Hari Ini",
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w700,
                                                      color: AppColors.success,
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),

                                          const SizedBox(height: 12),
                                          const Divider(height: 1),
                                          const SizedBox(height: 12),

                                          // Hari Operasional & Jam
                                          Row(
                                            children: [
                                              const Icon(Icons.event_outlined, size: 15, color: AppColors.textSecondary),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  "Hari: ${rute.hari}",
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                    color: AppColors.textPrimary,
                                                  ),
                                                ),
                                              ),
                                              if (rute.jam != null && rute.jam!.isNotEmpty) ...[
                                                const Icon(Icons.access_time_rounded, size: 14, color: AppColors.textSecondary),
                                                const SizedBox(width: 4),
                                                Text(
                                                  rute.jam!,
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.w600,
                                                    color: AppColors.textSecondary,
                                                  ),
                                                ),
                                              ],
                                            ],
                                          ),

                                          const SizedBox(height: 8),

                                          // Info Petugas & Jumlah Rumah
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Row(
                                                children: [
                                                  const Icon(Icons.badge_outlined, size: 14, color: AppColors.textMuted),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    rute.petugasNama != null ? "Petugas: ${rute.petugasNama}" : "Petugas: -",
                                                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                                  ),
                                                ],
                                              ),
                                              Row(
                                                children: [
                                                  const Icon(Icons.home_work_outlined, size: 14, color: AppColors.primaryDark),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    "${rute.totalJadwal} Titik Rumah",
                                                    style: const TextStyle(
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w700,
                                                      color: AppColors.primaryDark,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}
