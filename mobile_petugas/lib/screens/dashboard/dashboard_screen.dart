import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_version.dart';
import '../../providers/auth_provider.dart';
import '../../providers/absensi_provider.dart';
import '../../providers/pengangkutan_provider.dart';
import '../../providers/rute_provider.dart';
import '../../providers/update_provider.dart';
import '../../widgets/update_dialog.dart';
import '../absensi/absensi_screen.dart';
import '../pengangkutan/pengangkutan_list_screen.dart';
import '../survei/survei_list_screen.dart';
import '../tracking/live_tracking_screen.dart';
import '../komplain/lapor_kendala_screen.dart';
import '../rute/jadwal_rute_screen.dart';
import '../map/peta_driver_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AbsensiProvider>().loadStatus();
      context.read<PengangkutanProvider>().loadTugas();
      context.read<RuteProvider>().loadRute();
      context.read<UpdateProvider>().checkForUpdate(context: context);
    });
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Konfirmasi Keluar"),
        content: const Text("Apakah Anda yakin ingin keluar dari akun petugas?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Batal"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text("Keluar", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      context.read<AuthProvider>().logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final absensi = context.watch<AbsensiProvider>();
    final pengangkutan = context.watch<PengangkutanProvider>();
    final rute = context.watch<RuteProvider>();
    final update = context.watch<UpdateProvider>();

    final user = auth.user;
    final petugas = auth.petugas;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primarySurface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.local_shipping_rounded, color: AppColors.primaryDark, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "UPS HERU LAPANGAN",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800),
                ),
                Text(
                  "Operasional Harian",
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.normal),
                ),
              ],
            ),
          ],
        ),
        actions: [
          if (update.hasUpdate && update.updateInfo != null)
            IconButton(
              icon: const Badge(
                backgroundColor: AppColors.danger,
                child: Icon(Icons.system_update_rounded, color: AppColors.primaryDark),
              ),
              tooltip: "Pembaruan Tersedia",
              onPressed: () => UpdateDialog.show(context, update.updateInfo!),
            ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.danger),
            tooltip: "Keluar",
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            context.read<AbsensiProvider>().loadStatus(),
            context.read<PengangkutanProvider>().loadTugas(),
            context.read<RuteProvider>().loadRute(),
            context.read<UpdateProvider>().checkForUpdate(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 0. Banner Pembaruan Tersedia (Auto In-App Update)
              if (update.hasUpdate && update.updateInfo != null) ...[
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primaryDark,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryDark.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: InkWell(
                    onTap: () => UpdateDialog.show(context, update.updateInfo!),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Pembaruan v${update.updateInfo!.versionName} Tersedia!",
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                "Ketuk untuk memperbarui aplikasi langsung",
                                style: TextStyle(color: Colors.white70, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                      ],
                    ),
                  ),
                ),
              ],

              // 1. Profil Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 26,
                        backgroundColor: AppColors.primarySurface,
                        child: Text(
                          (user?.nama ?? "P").substring(0, 1).toUpperCase(),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user?.nama ?? "Petugas Lapangan",
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              petugas?.jabatan ?? "Kru Lapangan",
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.primaryDark,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (petugas?.kelurahan != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                "Kelurahan: ${petugas!.kelurahan}",
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 2. Status Absensi Hari Ini
              Card(
                child: InkWell(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AbsensiScreen()),
                  ),
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.timer_outlined, size: 18, color: AppColors.primaryDark),
                                SizedBox(width: 8),
                                Text(
                                  "Absensi Hari Ini",
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                                ),
                              ],
                            ),
                            Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: absensi.absensiHariIni?.sudahMasuk == true
                                      ? AppColors.successBg
                                      : AppColors.surfaceMuted,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Absen Masuk", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    const SizedBox(height: 4),
                                    Text(
                                      absensi.absensiHariIni?.sudahMasuk == true ? "✓ Sudah Masuk" : "Belum Absen",
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: absensi.absensiHariIni?.sudahMasuk == true
                                            ? AppColors.success
                                            : AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: absensi.absensiHariIni?.sudahSelesai == true
                                      ? AppColors.successBg
                                      : AppColors.surfaceMuted,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text("Absen Pulang", style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                                    const SizedBox(height: 4),
                                    Text(
                                      absensi.absensiHariIni?.sudahSelesai == true ? "✓ Selesai Tugas" : "Belum Selesai",
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: absensi.absensiHariIni?.sudahSelesai == true
                                            ? AppColors.success
                                            : AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 3. Ringkasan Tugas Pengangkutan Hari Ini
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            "Progres Pengangkutan",
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                          ),
                          Text(
                            "${pengangkutan.totalSelesai} / ${pengangkutan.totalTugas} Rumah",
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: pengangkutan.persentaseSelesai,
                          minHeight: 10,
                          backgroundColor: AppColors.border,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "Terjadwal: ${pengangkutan.totalTerjadwal}",
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          Text(
                            "Dilewati/Kosong: ${pengangkutan.totalDilewati}",
                            style: const TextStyle(fontSize: 12, color: AppColors.warning),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Banner Peta Rute Driver (Live Map)
              Card(
                color: const Color(0xFF0F766E), // Dark Teal
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: InkWell(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PetaDriverScreen()),
                  ),
                  borderRadius: BorderRadius.circular(16),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.map_rounded, color: Colors.white, size: 26),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Peta Rute Driver (Live Map)",
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                "Pantau sebaran titik jemput & navigasi armada",
                                style: TextStyle(fontSize: 11, color: Colors.white70),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // 4. Menu Utama Grid Aksi
              const Text(
                "Menu Operasional",
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.25,
                children: [
                  _buildMenuTile(
                    title: "Peta Driver",
                    subtitle: "Navigasi Live",
                    icon: Icons.map_rounded,
                    color: Colors.teal.shade800,
                    bgColor: Colors.teal.shade50,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PetaDriverScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    title: "Tugas Pickup",
                    subtitle: "${pengangkutan.totalTerjadwal} Tertunda",
                    icon: Icons.checklist_rounded,
                    color: AppColors.primary,
                    bgColor: AppColors.primarySurface,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const PengangkutanListScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    title: "Jadwal Rute",
                    subtitle: "${rute.totalRuteHariIni} Rute Hari Ini",
                    icon: Icons.alt_route_rounded,
                    color: Colors.teal.shade700,
                    bgColor: Colors.teal.shade50,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const JadwalRuteScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    title: "Survei Calon",
                    subtitle: "Geotagging Warga",
                    icon: Icons.add_location_alt_outlined,
                    color: AppColors.info,
                    bgColor: AppColors.infoBg,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const SurveiListScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    title: "Tracking Truk",
                    subtitle: "Beacon GPS Live",
                    icon: Icons.radar_rounded,
                    color: Colors.deepPurple,
                    bgColor: Colors.deepPurple.shade50,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LiveTrackingScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    title: "Lapor Kendala",
                    subtitle: "Komplain Darurat",
                    icon: Icons.warning_amber_rounded,
                    color: AppColors.danger,
                    bgColor: AppColors.dangerBg,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LaporKendalaScreen()),
                    ),
                  ),
                  _buildMenuTile(
                    title: "Riwayat Absen",
                    subtitle: "Kehadiran GPS",
                    icon: Icons.history_rounded,
                    color: Colors.blueGrey.shade700,
                    bgColor: Colors.blueGrey.shade50,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AbsensiScreen()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Versi Aplikasi & Tombol Periksa Pembaruan
              Center(
                child: TextButton.icon(
                  onPressed: () => context.read<UpdateProvider>().checkForUpdate(
                        context: context,
                        showToastIfLatest: true,
                      ),
                  icon: const Icon(Icons.sync_rounded, size: 14, color: AppColors.textMuted),
                  label: const Text(
                    "UPS HERU Lapangan v${AppVersion.versionName} • Cek Pembaruan",
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
