import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/rute_model.dart';
import '../../models/tugas_model.dart';
import '../../providers/pengangkutan_provider.dart';
import '../../providers/tracking_provider.dart';
import '../../services/routing_service.dart';

class PetaDriverScreen extends StatefulWidget {
  final int? initialRuteId;
  final String? initialRuteNama;
  final int? initialTargetPelangganId;
  final List<JadwalModel>? initialJadwalList;

  const PetaDriverScreen({
    super.key,
    this.initialRuteId,
    this.initialRuteNama,
    this.initialTargetPelangganId,
    this.initialJadwalList,
  });

  @override
  State<PetaDriverScreen> createState() => _PetaDriverScreenState();
}

class _PetaDriverScreenState extends State<PetaDriverScreen> {
  final MapController _mapController = MapController();
  TugasModel? _activeTarget;
  RouteResult? _currentRoadRoute;
  bool _isLoadingRoute = false;

  // Trip stats & timer
  DateTime? _tripStartTime;
  Timer? _tripTimer;
  Duration _tripDuration = Duration.zero;
  int _muatanTruk = 25; // 0, 25, 50, 75, 100%

  // Proximity threshold dalam meter
  static const double _arrivalThresholdMeters = 30.0;

  // Koordinat default Depok / Cilodong jika GPS belum terdeteksi
  static const LatLng _defaultCenter = LatLng(-6.424838, 106.832667);

  @override
  void initState() {
    super.initState();
    _tripStartTime = DateTime.now();
    _tripTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _tripStartTime != null) {
        setState(() {
          _tripDuration = DateTime.now().difference(_tripStartTime!);
        });
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PengangkutanProvider>().loadTugas();
      context.read<TrackingProvider>().startTracking();
    });
  }

  @override
  void dispose() {
    _tripTimer?.cancel();
    super.dispose();
  }

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    if (h > 0) {
      return "${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}";
    }
    return "${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}";
  }

  double _getDistanceToTarget(LatLng driverPos, TugasModel target) {
    if (!target.pelanggan.hasCoordinates) return 999999.0;
    return Geolocator.distanceBetween(
      driverPos.latitude,
      driverPos.longitude,
      target.pelanggan.latitude!,
      target.pelanggan.longitude!,
    );
  }

  Future<void> _fetchRoadRoute(LatLng driverPos, TugasModel target) async {
    if (!target.pelanggan.hasCoordinates) return;
    setState(() => _isLoadingRoute = true);

    final targetPos = LatLng(target.pelanggan.latitude!, target.pelanggan.longitude!);
    final res = await RoutingService.getDrivingRoute(driverPos, targetPos);

    if (mounted) {
      setState(() {
        _currentRoadRoute = res;
        _isLoadingRoute = false;
      });
    }
  }

  void _selectTarget(TugasModel tugas, LatLng driverPos) {
    setState(() {
      _activeTarget = tugas;
    });
    _fetchRoadRoute(driverPos, tugas);
    if (tugas.pelanggan.hasCoordinates) {
      _mapController.move(
        LatLng(tugas.pelanggan.latitude!, tugas.pelanggan.longitude!),
        16.5,
      );
    }
  }

  void _centerToDriver(LatLng driverPos) {
    _mapController.move(driverPos, 16.5);
  }

  void _fitAllStops(List<TugasModel> tasks, LatLng driverPos) {
    final coords = <LatLng>[driverPos];
    for (final t in tasks) {
      if (t.pelanggan.hasCoordinates) {
        coords.add(LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!));
      }
    }
    if (coords.length >= 2) {
      final bounds = LatLngBounds.fromPoints(coords);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 80),
        ),
      );
    } else {
      _centerToDriver(driverPos);
    }
  }

  Future<void> _handleSelesaiAngkut(TugasModel tugas, LatLng driverPos) async {
    final provider = context.read<PengangkutanProvider>();
    final success = await provider.quickPickup(
      tugas.id,
      lat: driverPos.latitude,
      lng: driverPos.longitude,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text("Sampah di ${tugas.pelanggan.nama} berhasil diangkut!")),
            ],
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );

      // Auto-advance ke target tertunda berikutnya
      final remaining = provider.tugasList.where((t) => t.isTerjadwal && t.id != tugas.id).toList();
      if (remaining.isNotEmpty) {
        _selectTarget(remaining.first, driverPos);
      } else {
        setState(() {
          _activeTarget = null;
          _currentRoadRoute = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("🎉 Hebat! Semua tugas rute hari ini telah selesai diangkut!"),
            backgroundColor: AppColors.primaryDark,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Gagal memperbarui status: ${provider.errorMessage ?? 'Kendala jaringan'}"),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  Future<void> _handleLewatiDialog(TugasModel tugas, LatLng driverPos) async {
    final alasanController = TextEditingController(text: "Rumah kosong / tidak ada sampah");
    String selectedStatus = "tidak_diangkut";

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text("Lewati Rumah Pelanggan", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Alasan melewati ${tugas.pelanggan.nama}:", style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: selectedStatus,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                items: const [
                  DropdownMenuItem(value: "tidak_diangkut", child: Text("Dilewati / Kendala Akses")),
                  DropdownMenuItem(value: "kosong", child: Text("Rumah Kosong / Tidak Ada Sampah")),
                ],
                onChanged: (val) {
                  if (val != null) {
                    setDialogState(() {
                      selectedStatus = val;
                      if (val == "kosong") {
                        alasanController.text = "Rumah kosong / tempat sampah tidak ditaruh di luar";
                      } else {
                        alasanController.text = "Pagar terkunci / jalan tidak dapat dilalui truk";
                      }
                    });
                  }
                },
              ),
              const SizedBox(height: 10),
              TextField(
                controller: alasanController,
                decoration: const InputDecoration(
                  labelText: "Catatan Petugas",
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text("Batal"),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.warning),
              child: const Text("Lewati & Lanjut", style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );

    if (confirm == true && mounted) {
      final provider = context.read<PengangkutanProvider>();
      await provider.lewatiRumah(tugas.id, selectedStatus, alasanController.text);
      if (mounted) {
        final remaining = provider.tugasList.where((t) => t.isTerjadwal && t.id != tugas.id).toList();
        if (remaining.isNotEmpty) {
          _selectTarget(remaining.first, driverPos);
        }
      }
    }
  }

  void _hubungiWA(TugasModel tugas) async {
    final phone = tugas.pelanggan.noTelepon;
    if (phone == null || phone.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Nomor telepon pelanggan belum terdaftar")),
      );
      return;
    }
    var clean = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (clean.startsWith('0')) clean = '62${clean.substring(1)}';

    final text = Uri.encodeComponent(
      "Halo ${tugas.pelanggan.nama}, kami petugas armada sampah UPS HERU sedang berada di sekitar lokasi untuk penjemputan sampah harian.",
    );
    final uri = Uri.parse("https://wa.me/$clean?text=$text");
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  void _teleponPelanggan(TugasModel tugas) async {
    final phone = tugas.pelanggan.noTelepon;
    if (phone == null || phone.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Nomor telepon pelanggan belum terdaftar")),
      );
      return;
    }
    final uri = Uri.parse("tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}");
    await launchUrl(uri);
  }

  void _openExternalGoogleMaps(TugasModel tugas) async {
    if (tugas.pelanggan.hasCoordinates) {
      final lat = tugas.pelanggan.latitude!;
      final lng = tugas.pelanggan.longitude!;
      final uri = Uri.parse("google.navigation:q=$lat,$lng&mode=d");
      final webUri = Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$lat,$lng");
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
      } else {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final pengangkutan = context.watch<PengangkutanProvider>();
    final tracking = context.watch<TrackingProvider>();

    final driverGeo = tracking.currentPosition;
    final driverPos = driverGeo != null
        ? LatLng(driverGeo.latitude, driverGeo.longitude)
        : _defaultCenter;

    List<TugasModel> allTasks = pengangkutan.tugasList;
    if (allTasks.isEmpty && widget.initialJadwalList != null && widget.initialJadwalList!.isNotEmpty) {
      allTasks = widget.initialJadwalList!.map((j) {
        return TugasModel(
          id: j.id,
          tanggal: DateTime.now().toIso8601String().substring(0, 10),
          status: 'terjadwal',
          urutan: j.urutan,
          pelanggan: PelangganTugas(
            id: j.pelangganId,
            nama: j.pelangganNama,
            kodePelanggan: j.pelangganKode,
            alamat: j.alamat,
            latitude: j.latitude,
            longitude: j.longitude,
          ),
          tunggakan: TunggakanInfo(
            isMenunggak: false,
            jumlahBulan: 0,
            totalNominal: 0,
          ),
        );
      }).toList();
    }
    final pendingTasks = allTasks.where((t) => t.isTerjadwal).toList();
    final completedCount = pengangkutan.totalSelesai;
    final totalCount = pengangkutan.totalTugas;
    final progressPercent = totalCount > 0 ? ((completedCount / totalCount) * 100).round() : 0;

    // Tentukan active target jika belum dipilih
    if (_activeTarget == null && pendingTasks.isNotEmpty) {
      if (widget.initialTargetPelangganId != null) {
        _activeTarget = pendingTasks.firstWhere(
          (t) => t.pelanggan.id == widget.initialTargetPelangganId,
          orElse: () => pendingTasks.first,
        );
      } else {
        _activeTarget = pendingTasks.first;
      }
      _fetchRoadRoute(driverPos, _activeTarget!);
    }

    final distanceMeters = _activeTarget != null
        ? _getDistanceToTarget(driverPos, _activeTarget!)
        : null;
    final isArrived = distanceMeters != null && distanceMeters <= _arrivalThresholdMeters;

    // Siapkan daftar koordinat antrean rute (Polyline Antrean Sisa, berawal dari posisi truk)
    final queuePoints = <LatLng>[driverPos];
    for (final t in pendingTasks) {
      if (t.pelanggan.hasCoordinates) {
        queuePoints.add(LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!));
      }
    }

    // Bangun Markers
    final markers = <Marker>[];

    // 1. Marker Posisi Truk Driver (Live Pulse Beacon)
    markers.add(
      Marker(
        point: driverPos,
        width: 58,
        height: 58,
        child: GestureDetector(
          onTap: () => _centerToDriver(driverPos),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF00AA13).withValues(alpha: 0.25),
                ),
              ),
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF00AA13), // Gojek Bright Green
                  border: Border.all(color: Colors.white, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Center(
                  child: Text("🚛", style: TextStyle(fontSize: 20)),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // 2. Marker Rumah Pelanggan Berurutan (Gojek Cockpit Style Pin)
    for (int i = 0; i < allTasks.length; i++) {
      final t = allTasks[i];
      if (!t.pelanggan.hasCoordinates) continue;

      final pos = LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!);
      final isTarget = _activeTarget?.id == t.id;
      final isSelesai = t.isSelesai;
      final isMenunggak = t.tunggakan.isMenunggak;

      final seqNum = t.urutan ?? (i + 1);
      Color pinBg;
      String pinIcon;
      if (isSelesai) {
        pinBg = const Color(0xFF059669); // Emerald
        pinIcon = "✓";
      } else if (isMenunggak) {
        pinBg = const Color(0xFFDC2626); // Red
        pinIcon = "⛔";
      } else if (isTarget) {
        pinBg = const Color(0xFF00AA13); // Gojek Green
        pinIcon = "#$seqNum";
      } else {
        pinBg = const Color(0xFF0284C7); // Sky Blue
        pinIcon = "#$seqNum";
      }

      markers.add(
        Marker(
          point: pos,
          width: isTarget ? 68 : 54,
          height: isTarget ? 72 : 58,
          child: GestureDetector(
            onTap: () => _selectTarget(t, driverPos),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: isTarget ? 38 : 30,
                  height: isTarget ? 38 : 30,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: pinBg,
                    border: Border.all(
                      color: isTarget ? Colors.yellowAccent : Colors.white,
                      width: isTarget ? 3 : 2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isTarget
                            ? const Color(0xFF00AA13).withValues(alpha: 0.6)
                            : Colors.black.withValues(alpha: 0.3),
                        blurRadius: isTarget ? 10 : 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      pinIcon,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: isTarget ? 13 : 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                  decoration: BoxDecoration(
                    color: isTarget
                        ? const Color(0xFF00AA13)
                        : (isMenunggak ? const Color(0xFF991B1B) : Colors.black87),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white38, width: 0.8),
                  ),
                  child: Text(
                    t.pelanggan.nama,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // 1. PETA INTERAKTIF FLUTTER MAP
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: driverPos,
              initialZoom: 16.0,
              minZoom: 5.0,
              maxZoom: 18.5,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'id.o2whero.lapangan',
                maxZoom: 19,
              ),

              // Rute Keseluruhan Sisa Antrean (Garis Abu/Putih Lembut)
              if (queuePoints.length > 1)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: queuePoints,
                      color: Colors.blueGrey.withValues(alpha: 0.45),
                      strokeWidth: 3.0,
                    ),
                  ],
                ),

              // Rute Jalan Raya Nyata Mandiri via OSRM (Garis Hijau Navigasi Utama)
              if (_currentRoadRoute != null && _currentRoadRoute!.points.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _currentRoadRoute!.points,
                      color: const Color(0xFF00AA13), // Active Navigation Green
                      strokeWidth: 5.5,
                      borderStrokeWidth: 2.0,
                      borderColor: Colors.white,
                    ),
                  ],
                )
              else if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates)
                // Fallback garis langsung jika OSRM sedang memuat
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: [
                        driverPos,
                        LatLng(_activeTarget!.pelanggan.latitude!, _activeTarget!.pelanggan.longitude!),
                      ],
                      color: const Color(0xFF00AA13).withValues(alpha: 0.7),
                      strokeWidth: 4.0,
                    ),
                  ],
                ),

              MarkerLayer(markers: markers),
            ],
          ),

          // 2. TOP HUD DRIVER COCKPIT (Gojek / Grab Driver Style)
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Bar 1: Status Trip & Muatan Truk
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.95), // Slate 900
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.35),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 22),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () => Navigator.pop(context),
                            ),
                            const SizedBox(width: 10),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.timer_outlined, size: 13, color: Color(0xFF34D399)),
                                    const SizedBox(width: 4),
                                    Text(
                                      _formatDuration(_tripDuration),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w900,
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ],
                                ),
                                Text(
                                  "Stop #${completedCount + 1} dari $totalCount • $progressPercent% Selesai",
                                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                                ),
                              ],
                            ),
                          ],
                        ),

                        // Muatan Truk Quick Selector
                        PopupMenuButton<int>(
                          initialValue: _muatanTruk,
                          onSelected: (val) => setState(() => _muatanTruk = val),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          color: const Color(0xFF1E293B),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: _muatanTruk >= 75
                                  ? Colors.red.shade900
                                  : (_muatanTruk >= 50 ? Colors.amber.shade900 : Colors.teal.shade900),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white30, width: 0.8),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.scale_rounded, size: 14, color: Colors.white),
                                const SizedBox(width: 4),
                                Text(
                                  "Muatan $_muatanTruk%",
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const Icon(Icons.arrow_drop_down, size: 14, color: Colors.white),
                              ],
                            ),
                          ),
                          itemBuilder: (ctx) => [
                            const PopupMenuItem(value: 0, child: Text("Muatan 0% (Kosong)", style: TextStyle(color: Colors.white))),
                            const PopupMenuItem(value: 25, child: Text("Muatan 25% (Seperempat)", style: TextStyle(color: Colors.white))),
                            const PopupMenuItem(value: 50, child: Text("Muatan 50% (Setengah)", style: TextStyle(color: Colors.white))),
                            const PopupMenuItem(value: 75, child: Text("Muatan 75% (Hampir Penuh)", style: TextStyle(color: Colors.white))),
                            const PopupMenuItem(value: 100, child: Text("Muatan 100% (Penuh / Siap TPA)", style: TextStyle(color: Colors.white))),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Bar 2: Turn-By-Turn Navigation Direction Banner (Mandiri In-App)
                  if (_activeTarget != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isArrived
                            ? const Color(0xFF047857) // Arrived Green
                            : const Color(0xFF0284C7), // Navigating Blue
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              isArrived
                                  ? Icons.location_on_rounded
                                  : (_currentRoadRoute != null && _currentRoadRoute!.steps.isNotEmpty
                                      ? (_currentRoadRoute!.steps.first.modifier.contains('left')
                                          ? Icons.turn_left_rounded
                                          : _currentRoadRoute!.steps.first.modifier.contains('right')
                                              ? Icons.turn_right_rounded
                                              : Icons.straight_rounded)
                                      : Icons.navigation_rounded),
                              color: Colors.white,
                              size: 22,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  isArrived
                                      ? "📍 ANDA TELAH TIBA DI LOKASI!"
                                      : (_currentRoadRoute != null && _currentRoadRoute!.steps.isNotEmpty
                                          ? _currentRoadRoute!.steps.first.instruction
                                          : "Menuju Rumah: ${_activeTarget!.pelanggan.nama}"),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 13,
                                    fontWeight: FontWeight.w900,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  isArrived
                                      ? "Ketuk 'Selesai Angkut' di bawah untuk mencatat sampah"
                                      : "${distanceMeters != null ? (distanceMeters < 1000 ? '${distanceMeters.round()} m' : '${(distanceMeters / 1000).toStringAsFixed(1)} km') : 'Menghitung'} • ${_currentRoadRoute?.formattedDuration ?? '1 mnt'}",
                                  style: const TextStyle(
                                    color: Colors.white70,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (_isLoadingRoute)
                            const Padding(
                              padding: EdgeInsets.only(left: 8),
                              child: SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // 3. FLOATING CAMERA CONTROLS (Kanan Layar)
          Positioned(
            right: 14,
            bottom: _activeTarget != null ? 230 : 40,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: "btn_center_driver",
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF00AA13),
                  tooltip: "Pusatkan ke Truk",
                  onPressed: () => _centerToDriver(driverPos),
                  child: const Icon(Icons.my_location_rounded),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: "btn_fit_all",
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0F172A),
                  tooltip: "Lihat Seluruh Rute",
                  onPressed: () => _fitAllStops(allTasks, driverPos),
                  child: const Icon(Icons.crop_free_rounded),
                ),
                const SizedBox(height: 8),
                if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates)
                  FloatingActionButton.small(
                    heroTag: "btn_focus_target",
                    backgroundColor: Colors.white,
                    foregroundColor: Colors.blue.shade700,
                    tooltip: "Fokus ke Target",
                    onPressed: () => _mapController.move(
                      LatLng(_activeTarget!.pelanggan.latitude!, _activeTarget!.pelanggan.longitude!),
                      17.0,
                    ),
                    child: const Icon(Icons.place_rounded),
                  ),
              ],
            ),
          ),

          // 4. BOTTOM COCKPIT HUD CARD (Mandiri Tanpa Perlu Keluar App)
          if (_activeTarget != null)
            Positioned(
              left: 12,
              right: 12,
              bottom: 16,
              child: Card(
                elevation: 12,
                color: const Color(0xFF0F172A), // Dark Slate Modern HUD
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(22),
                  side: BorderSide(
                    color: isArrived ? const Color(0xFF00AA13) : const Color(0xFF334155),
                    width: isArrived ? 2.5 : 1.0,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Kartu Pelanggan
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isArrived
                                        ? const Color(0xFF00AA13)
                                        : Colors.blue.shade800,
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(
                                    isArrived ? Icons.check_circle_rounded : Icons.home_rounded,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _activeTarget!.pelanggan.nama,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.w900,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        _activeTarget!.pelanggan.alamat,
                                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Tombol WhatsApp & Telepon Cepat
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF25D366), size: 22),
                                tooltip: "Chat WhatsApp",
                                onPressed: () => _hubungiWA(_activeTarget!),
                              ),
                              IconButton(
                                icon: const Icon(Icons.phone_rounded, color: Colors.lightBlueAccent, size: 22),
                                tooltip: "Telepon Warga",
                                onPressed: () => _teleponPelanggan(_activeTarget!),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Patokan & Peringatan Tunggakan
                      if (_activeTarget!.pelanggan.patokanLokasi != null || _activeTarget!.tunggakan.isMenunggak) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (_activeTarget!.pelanggan.patokanLokasi != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  "📍 ${_activeTarget!.pelanggan.patokanLokasi}",
                                  style: const TextStyle(color: Colors.white, fontSize: 11),
                                ),
                              ),
                            if (_activeTarget!.tunggakan.isMenunggak)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade900,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  "⛔ Menunggak ${_activeTarget!.tunggakan.jumlahBulan} bln",
                                  style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ),
                          ],
                        ),
                      ],

                      const SizedBox(height: 14),

                      // TOMBOL UTAMA AKSI DRIVER (MANDIRI 1-KETUKAN)
                      Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isArrived ? const Color(0xFF00AA13) : const Color(0xFF0284C7),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                elevation: isArrived ? 6 : 2,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              icon: Icon(
                                isArrived ? Icons.check_circle_rounded : Icons.check_rounded,
                                size: 22,
                              ),
                              label: Text(
                                isArrived ? "✓ SELESAI ANGKUT SAMPAH" : "SELESAI ANGKUT (TIBA)",
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                              onPressed: () => _handleSelesaiAngkut(_activeTarget!, driverPos),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Tombol Lewati
                          OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.amberAccent,
                              side: const BorderSide(color: Colors.amberAccent),
                              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            onPressed: () => _handleLewatiDialog(_activeTarget!, driverPos),
                            child: const Text("Lewati", style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),

                      // Optional external Google Maps fallback (hanya link kecil, tidak dipaksa keluar)
                      Center(
                        child: TextButton.icon(
                          onPressed: () => _openExternalGoogleMaps(_activeTarget!),
                          icon: const Icon(Icons.open_in_new_rounded, size: 12, color: Colors.white54),
                          label: const Text(
                            "Opsi: Buka di Google Maps Eksternal",
                            style: TextStyle(color: Colors.white54, fontSize: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          if (allTasks.isEmpty)
            Positioned(
              left: 14,
              right: 14,
              bottom: 24,
              child: Card(
                elevation: 12,
                color: const Color(0xFF0F172A),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: const BorderSide(color: Color(0xFF334155)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00AA13).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text("🚛", style: TextStyle(fontSize: 22)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  "Tidak Ada Rute Aktif Hari Ini",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  provider.isToday
                                      ? "Hari ini (${provider.formattedDateTitle}) adalah jadwal standby armada."
                                      : "Tidak ada jadwal tugas pengangkutan pada tanggal ini.",
                                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () {
                                provider.setBesok();
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF00AA13),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                              label: Text(
                                "Muat Rute Besok (${provider.besokDayName})",
                                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
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
        ],
      ),
    );
  }
}
