import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/admin_provider.dart';
import 'admin_pelanggan_screen.dart';
import 'admin_peta_armada_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AdminProvider>().init();
    });
  }

  void _showSyncModal() {
    final admin = context.read<AdminProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Consumer<AdminProvider>(
        builder: (ctx, ap, _) => Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.storage_rounded, color: Color(0xFF38BDF8), size: 24),
                      SizedBox(width: 10),
                      Text(
                        "Penyimpanan Lokal HP",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white54),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                "Data warga tersimpan di ponsel untuk akses 0 detik tanpa tarik ulang database.",
                style: TextStyle(color: Colors.white70, fontSize: 12),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF334155)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Total Warga di HP", style: TextStyle(color: Colors.white54, fontSize: 11)),
                        Text(
                          "${ap.totalCached} Pelanggan",
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text("Metode Sinkron", style: TextStyle(color: Colors.white54, fontSize: 11)),
                        const Text(
                          "Delta Sync (Cepat)",
                          style: TextStyle(color: Color(0xFF4ADE80), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (ap.statusMessage != null) ...[
                const SizedBox(height: 10),
                Text(
                  ap.statusMessage!,
                  style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12),
                ),
              ],
              const SizedBox(height: 18),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: ap.isSyncing
                      ? null
                      : () async {
                          await ap.syncDelta();
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00AA13),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: ap.isSyncing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.sync_rounded),
                  label: Text(ap.isSyncing ? "Menyinkronkan..." : "Sinkron Perubahan Baru (Delta)"),
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: ap.isSyncing
                      ? null
                      : () async {
                          await ap.downloadMaster();
                        },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white70,
                    side: const BorderSide(color: Color(0xFF475569)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  icon: const Icon(Icons.download_rounded, size: 18),
                  label: const Text("Unduh Ulang Master Lengkap"),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final admin = context.watch<AdminProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: const Color(0xFF0B1120), // Dark Executive Slate
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => admin.syncDelta(),
          color: const Color(0xFF00AA13),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Topbar Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFF0284C7), width: 1.5),
                          ),
                          child: const Center(
                            child: Icon(Icons.admin_panel_settings_rounded, color: Color(0xFF38BDF8), size: 24),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  user?.nama ?? "Admin Backoffice",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF0284C7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    "ADMIN",
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Text(
                              "UPS HERU Kota Depok",
                              style: TextStyle(color: Colors.white54, fontSize: 11),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout_rounded, color: Colors.redAccent, size: 22),
                      tooltip: "Keluar Akun",
                      onPressed: () => auth.logout(),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Offline-First Sync Banner Pill
                GestureDetector(
                  onTap: _showSyncModal,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF4ADE80),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Data Tersimpan di HP (Offline Mode)",
                                  style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                ),
                                Text(
                                  "${admin.totalCached} Pelanggan • Buka Instan 0 Detik",
                                  style: const TextStyle(color: Colors.white54, fontSize: 10),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0284C7).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFF0284C7)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.sync_rounded, color: Color(0xFF38BDF8), size: 14),
                              SizedBox(width: 4),
                              Text("Sync", style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                const Text(
                  "Status Operasional Warga",
                  style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 10),

                // 4 Status Warga Cards Grid
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                  childAspectRatio: 1.7,
                  children: [
                    _buildMetricCard(
                      label: "Warga Aktif",
                      count: admin.countAktif,
                      color: const Color(0xFF00AA13),
                      icon: Icons.check_circle_rounded,
                      onTap: () {
                        admin.setSelectedStatus("aktif");
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPelangganScreen()));
                      },
                    ),
                    _buildMetricCard(
                      label: "Calon Warga",
                      count: admin.countCalon,
                      color: const Color(0xFFF59E0B),
                      icon: Icons.person_add_rounded,
                      onTap: () {
                        admin.setSelectedStatus("calon");
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPelangganScreen()));
                      },
                    ),
                    _buildMetricCard(
                      label: "Nonaktif",
                      count: admin.countNonaktif,
                      color: const Color(0xFFEF4444),
                      icon: Icons.cancel_rounded,
                      onTap: () {
                        admin.setSelectedStatus("nonaktif");
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPelangganScreen()));
                      },
                    ),
                    _buildMetricCard(
                      label: "Libur / Cuti",
                      count: admin.countLibur,
                      color: const Color(0xFF64748B),
                      icon: Icons.pause_circle_rounded,
                      onTap: () {
                        admin.setSelectedStatus("libur");
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPelangganScreen()));
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 22),

                const Text(
                  "Menu Kontrol Backoffice",
                  style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 10),

                // Action Menu Cards
                _buildActionTile(
                  icon: Icons.people_alt_rounded,
                  iconBg: const Color(0xFF0284C7),
                  title: "Daftar Pelanggan & Barcode",
                  subtitle: "Cari cepat di memori HP, status bayar & kontak WA",
                  onTap: () {
                    admin.setSelectedStatus("semua");
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPelangganScreen()));
                  },
                ),
                const SizedBox(height: 10),
                _buildActionTile(
                  icon: Icons.map_rounded,
                  iconBg: const Color(0xFF10B981),
                  title: "Peta Monitor Armada Supir",
                  subtitle: "Pantau rute 3 truk armada & sebaran titik warga",
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminPetaArmadaScreen()));
                  },
                ),
                const SizedBox(height: 10),
                _buildActionTile(
                  icon: Icons.sync_rounded,
                  iconBg: const Color(0xFF8B5CF6),
                  title: "Sinkronisasi Delta Cache",
                  subtitle: "Periksa pembaruan data terbaru tanpa beban server",
                  onTap: _showSyncModal,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String label,
    required int count,
    required Color color,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.3)),
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
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600)),
                Icon(icon, color: color, size: 18),
              ],
            ),
            Text(
              "$count",
              style: TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w900,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required Color iconBg,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBg.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: iconBg.withValues(alpha: 0.3)),
              ),
              child: Icon(icon, color: iconBg, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(color: Colors.white54, fontSize: 11)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Colors.white38),
          ],
        ),
      ),
    );
  }
}
