import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/calon_pelanggan_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/survei_provider.dart';
import 'survei_detail_screen.dart';

class SurveiListScreen extends StatefulWidget {
  const SurveiListScreen({super.key});

  @override
  State<SurveiListScreen> createState() => _SurveiListScreenState();
}

class _SurveiListScreenState extends State<SurveiListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final petugas = context.read<AuthProvider>().petugas;
      context.read<SurveiProvider>().loadCalonList(kelurahan: petugas?.kelurahan);
    });
  }

  Future<void> _openWhatsApp(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    String clean = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.startsWith('0')) clean = '62${clean.substring(1)}';
    final uri = Uri.parse("https://wa.me/$clean?text=${Uri.encodeComponent('Halo, saya petugas UPS HERU Lapangan terkait pendaftaran layanan sampah.')}");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SurveiProvider>();
    final list = provider.calonList;
    final petugas = context.watch<AuthProvider>().petugas;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text("Survei Calon Pelanggan"),
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.loadCalonList(kelurahan: petugas?.kelurahan),
        child: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : list.isEmpty
                ? ListView(
                    children: const [
                      SizedBox(height: 80),
                      Center(
                        child: Column(
                          children: [
                            Icon(Icons.check_circle_outline_rounded, size: 48, color: AppColors.success),
                            SizedBox(height: 12),
                            Text(
                              "Tidak ada calon pelanggan baru",
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                            ),
                            SizedBox(height: 4),
                            Text(
                              "Semua pendaftaran mandiri warga telah selesai disurvei",
                              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
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
                      final item = list[idx];
                      return _buildCalonCard(item);
                    },
                  ),
      ),
    );
  }

  Widget _buildCalonCard(CalonPelangganModel item) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    item.nama,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.warningBg,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    "Perlu Survei",
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.warning),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 16, color: AppColors.textMuted),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    item.alamat,
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                ),
              ],
            ),
            if (item.kelurahan != null) ...[
              const SizedBox(height: 4),
              Text(
                "Kelurahan: ${item.kelurahan}",
                style: const TextStyle(fontSize: 12, color: AppColors.primaryDark),
              ),
            ],
            const SizedBox(height: 14),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 12),
            Row(
              children: [
                if (item.noTelepon != null && item.noTelepon!.isNotEmpty) ...[
                  OutlinedButton.icon(
                    onPressed: () => _openWhatsApp(item.noTelepon),
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Color(0xFF25D366)),
                    label: const Text("WhatsApp", style: TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF25D366)),
                      foregroundColor: const Color(0xFF25D366),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => SurveiDetailScreen(calon: item),
                    ),
                  ),
                  icon: const Icon(Icons.add_location_alt_outlined, size: 16),
                  label: const Text("Survei & Geotag", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
