import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/rute_model.dart';
import '../../services/rute_service.dart';

class RuteDetailScreen extends StatefulWidget {
  final int ruteId;
  final RuteModel? initialRute;

  const RuteDetailScreen({
    super.key,
    required this.ruteId,
    this.initialRute,
  });

  @override
  State<RuteDetailScreen> createState() => _RuteDetailScreenState();
}

class _RuteDetailScreenState extends State<RuteDetailScreen> {
  RuteModel? _rute;
  List<JadwalModel> _jadwalList = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _rute = widget.initialRute;
    _fetchDetail();
  }

  Future<void> _fetchDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // 1. Fetch rute detail
      final detail = await RuteService.getRuteDetail(widget.ruteId);
      // 2. Fetch jadwal list for this rute
      List<JadwalModel> jadwals = [];
      try {
        jadwals = await RuteService.getJadwalByRute(widget.ruteId);
      } catch (_) {
        if (detail != null && detail.jadwal.isNotEmpty) {
          jadwals = detail.jadwal;
        }
      }

      setState(() {
        if (detail != null) _rute = detail;
        _jadwalList = jadwals.isNotEmpty ? jadwals : (detail?.jadwal ?? []);
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll("Exception: ", "").replaceAll("ApiException: ", "");
      });
    }
  }

  Future<void> _openGoogleMapsAll() async {
    final withCoords = _jadwalList.where((j) => j.hasCoordinates).toList();
    if (withCoords.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Belum ada koordinat GPS pelanggan pada rute ini"),
          backgroundColor: AppColors.warning,
        ),
      );
      return;
    }

    if (withCoords.length == 1) {
      final j = withCoords.first;
      final uri = Uri.parse("google.navigation:q=${j.latitude},${j.longitude}&mode=d");
      final webUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${j.latitude},${j.longitude}");
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
      return;
    }

    // Multi-stop waypoint navigation
    final dest = withCoords.last;
    final waypoints = withCoords
        .sublist(0, withCoords.length - 1)
        .take(8) // Google Maps supports up to 8-9 waypoints in URL
        .map((j) => "${j.latitude},${j.longitude}")
        .join("|");

    final url = "https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}&waypoints=$waypoints&travelmode=driving";
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Gagal membuka Google Maps")),
        );
      }
    }
  }

  Future<void> _openNavigationSingle(JadwalModel jadwal) async {
    if (jadwal.hasCoordinates) {
      final uri = Uri.parse("google.navigation:q=${jadwal.latitude},${jadwal.longitude}&mode=d");
      final webUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${jadwal.latitude},${jadwal.longitude}");
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    } else {
      // Fallback search by address
      final encoded = Uri.encodeComponent(jadwal.pelangganAlamat);
      final uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=$encoded");
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _callPhone(String? phone) async {
    if (phone == null || phone.trim().isEmpty) return;
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    final uri = Uri.parse("tel:$cleanPhone");
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rute = _rute;
    final coordsCount = _jadwalList.where((j) => j.hasCoordinates).length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          rute?.nama ?? "Detail Rute",
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Muat Ulang",
            onPressed: _fetchDetail,
          ),
        ],
      ),
      body: _isLoading && rute == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchDetail,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // 1. Info Header Card Rute
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primarySurface,
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: const Icon(
                                    Icons.alt_route_rounded,
                                    color: AppColors.primaryDark,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        rute?.nama ?? "Rute Pengangkutan",
                                        style: const TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        "${rute?.kelurahanNama ?? '-'} ${rute?.zonaNama != null ? '• ${rute!.zonaNama}' : ''}",
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            const Divider(height: 1),
                            const SizedBox(height: 14),

                            // Grid Info Singkat
                            Row(
                              children: [
                                Expanded(
                                  child: _buildInfoItem(
                                    icon: Icons.event_rounded,
                                    label: "Hari Operasional",
                                    value: rute?.hari ?? "-",
                                  ),
                                ),
                                Expanded(
                                  child: _buildInfoItem(
                                    icon: Icons.access_time_rounded,
                                    label: "Jam Operasi",
                                    value: rute?.jam != null && rute!.jam!.isNotEmpty ? rute.jam! : "Fleksibel",
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Row(
                              children: [
                                Expanded(
                                  child: _buildInfoItem(
                                    icon: Icons.person_outline_rounded,
                                    label: "Petugas Ditugaskan",
                                    value: rute?.petugasNama ?? "Belum Ditentukan",
                                  ),
                                ),
                                Expanded(
                                  child: _buildInfoItem(
                                    icon: Icons.pin_drop_outlined,
                                    label: "Geotag GPS",
                                    value: "$coordsCount dari ${_jadwalList.length} titik",
                                  ),
                                ),
                              ],
                            ),

                            if (coordsCount > 0) ...[
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.blue.shade700,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                  ),
                                  icon: const Icon(Icons.directions_rounded, size: 20),
                                  label: const Text(
                                    "Navigasi Rute di Google Maps",
                                    style: TextStyle(fontWeight: FontWeight.w700),
                                  ),
                                  onPressed: _openGoogleMapsAll,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),

                    // 2. Daftar Titik Pelanggan / Jadwal
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          "Urutan Titik Pengambilan",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppColors.primarySurface,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            "${_jadwalList.length} Rumah",
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryDark,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (_errorMessage != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppColors.danger, fontSize: 13),
                        ),
                      ),

                    if (_jadwalList.isEmpty && !_isLoading)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Column(
                            children: [
                              Icon(Icons.inbox_rounded, size: 40, color: AppColors.textMuted),
                              SizedBox(height: 10),
                              Text(
                                "Belum ada pelanggan terdaftar di rute ini",
                                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                              SizedBox(height: 4),
                              Text(
                                "Admin web dapat menambahkan jadwal pelanggan ke rute ini.",
                                textAlign: TextAlign.center,
                                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _jadwalList.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final jadwal = _jadwalList[index];

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      // Nomor urut stop
                                      Container(
                                        width: 28,
                                        height: 28,
                                        alignment: Alignment.center,
                                        decoration: BoxDecoration(
                                          color: AppColors.primaryDark,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          "${index + 1}",
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              jadwal.pelangganNama,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              jadwal.pelangganAlamat,
                                              style: const TextStyle(
                                                fontSize: 12,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                            if (jadwal.pelangganPatokan != null && jadwal.pelangganPatokan!.isNotEmpty) ...[
                                              const SizedBox(height: 2),
                                              Text(
                                                "Patokan: ${jadwal.pelangganPatokan}",
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  fontStyle: FontStyle.italic,
                                                  color: AppColors.textMuted,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      if (jadwal.hari.isNotEmpty)
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: AppColors.surfaceMuted,
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            jadwal.hari,
                                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
                                          ),
                                        ),
                                    ],
                                  ),

                                  const SizedBox(height: 10),
                                  const Divider(height: 1),
                                  const SizedBox(height: 10),

                                  // Baris Aksi Pelanggan
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      if (jadwal.pelangganNoTelepon != null && jadwal.pelangganNoTelepon!.isNotEmpty) ...[
                                        OutlinedButton.icon(
                                          style: OutlinedButton.styleFrom(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            visualDensity: VisualDensity.compact,
                                          ),
                                          icon: const Icon(Icons.phone_rounded, size: 14),
                                          label: const Text("Telepon", style: TextStyle(fontSize: 11)),
                                          onPressed: () => _callPhone(jadwal.pelangganNoTelepon),
                                        ),
                                        const SizedBox(width: 8),
                                      ],
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.primaryDark,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                          visualDensity: VisualDensity.compact,
                                        ),
                                        icon: const Icon(Icons.near_me_rounded, size: 14),
                                        label: const Text("Navigasi", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                                        onPressed: () => _openNavigationSingle(jadwal),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 13, color: AppColors.textMuted),
            const SizedBox(width: 4),
            Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}
