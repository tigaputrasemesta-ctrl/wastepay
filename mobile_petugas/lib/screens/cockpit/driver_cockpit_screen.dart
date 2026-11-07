import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../core/constants/app_colors.dart';
import '../../models/tugas_model.dart';
import '../../providers/absensi_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/pengangkutan_provider.dart';
import '../../providers/tracking_provider.dart';
import '../../services/driver_actions_service.dart';
import '../../services/external_navigation_service.dart';
import '../../services/routing_service.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/swipe_to_pickup_slider.dart';
import '../absensi/absensi_screen.dart';
import '../pengangkutan/pengangkutan_detail_screen.dart';

class DriverCockpitScreen extends StatefulWidget {
  const DriverCockpitScreen({super.key});

  @override
  State<DriverCockpitScreen> createState() => _DriverCockpitScreenState();
}

class _DriverCockpitScreenState extends State<DriverCockpitScreen> with WidgetsBindingObserver {
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();

  // State tampilan
  String _activeView = "peta"; // "peta" atau "daftar"
  TugasModel? _activeTarget;
  RouteResult? _currentRoadRoute;
  bool _isLoadingRoute = false;

  // Telemetri Trip Driver
  Timer? _tripTimer;
  int _tripSeconds = 0;
  int _muatanTruk = 0; // 0, 25, 50, 75, 100%

  // Proximity Geofence
  bool _hasAlertedCurrentTarget = false;
  static const double _arrivalRadiusMeters = 30.0;

  // Pusat default Kota Depok
  static const LatLng _defaultCenter = LatLng(-6.4025, 106.7942);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Mulai timer durasi kerja driver
    _tripTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _tripSeconds++);
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initDriverSession();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tripTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _initDriverSession() async {
    final auth = context.read<AuthProvider>();
    if (auth.petugas != null) {
      context.read<TrackingProvider>().setContextIds(petugasId: auth.petugas!.id);
      context.read<TrackingProvider>().startTracking();
    }

    await context.read<AbsensiProvider>().loadStatus();
    await context.read<PengangkutanProvider>().loadTugas();
    _selectNextTarget();
  }

  void _selectNextTarget() {
    final tasks = context.read<PengangkutanProvider>().tugasList;
    final pending = tasks.where((t) => t.isTerjadwal).toList();

    if (pending.isNotEmpty) {
      setState(() {
        _activeTarget = pending.first;
        _hasAlertedCurrentTarget = false;
      });
      _fetchRoadRoute();
    } else {
      setState(() {
        _activeTarget = null;
        _currentRoadRoute = null;
      });
    }
  }

  Future<void> _fetchRoadRoute() async {
    if (_activeTarget == null || !_activeTarget!.pelanggan.hasCoordinates) return;

    final tracking = context.read<TrackingProvider>();
    final driverPos = tracking.currentPosition;
    if (driverPos == null) return;

    setState(() => _isLoadingRoute = true);

    final start = LatLng(driverPos.latitude, driverPos.longitude);
    final end = LatLng(_activeTarget!.pelanggan.latitude!, _activeTarget!.pelanggan.longitude!);

    final result = await RoutingService.getDrivingRoute(start, end);

    if (mounted) {
      setState(() {
        _currentRoadRoute = result;
        _isLoadingRoute = false;
      });
    }
  }

  void _checkProximityAlert(LatLng driverPos) {
    if (_activeTarget == null || !_activeTarget!.pelanggan.hasCoordinates || _hasAlertedCurrentTarget) return;

    final dist = _calculateDistance(
      driverPos.latitude,
      driverPos.longitude,
      _activeTarget!.pelanggan.latitude!,
      _activeTarget!.pelanggan.longitude!,
    );

    if (dist <= _arrivalRadiusMeters) {
      _hasAlertedCurrentTarget = true;
      HapticFeedback.heavyImpact();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("📍 Tiba di lokasi: ${_activeTarget!.pelanggan.nama}"),
          backgroundColor: const Color(0xFF047857),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295;
    final a = 0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742000 * asin(sqrt(a));
  }

  String _formatDuration(int totalSeconds) {
    final h = totalSeconds ~/ 3600;
    final m = (totalSeconds % 3600) ~/ 60;
    final s = totalSeconds % 60;
    if (h > 0) return "${h}j ${m.toString().padLeft(2, '0')}m";
    return "${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}";
  }

  void _recenterCamera() {
    final tracking = context.read<TrackingProvider>();
    final pos = tracking.currentPosition;
    if (pos != null) {
      _mapController.move(LatLng(pos.latitude, pos.longitude), 17.0);
    } else if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates) {
      _mapController.move(
        LatLng(_activeTarget!.pelanggan.latitude!, _activeTarget!.pelanggan.longitude!),
        17.0,
      );
    }
  }

  void _fitAllStops() {
    final tasks = context.read<PengangkutanProvider>().tugasList;
    final points = <LatLng>[];

    final tracking = context.read<TrackingProvider>();
    if (tracking.currentPosition != null) {
      points.add(LatLng(tracking.currentPosition!.latitude, tracking.currentPosition!.longitude));
    }

    for (final t in tasks) {
      if (t.pelanggan.hasCoordinates) {
        points.add(LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!));
      }
    }

    if (points.isNotEmpty) {
      final bounds = LatLngBounds.fromPoints(points);
      _mapController.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(40)));
    }
  }

  Future<void> _handleConfirmPickup() async {
    if (_activeTarget == null) return;

    final tracking = context.read<TrackingProvider>();
    final pos = tracking.currentPosition;

    final targetId = _activeTarget!.id;
    final targetName = _activeTarget!.pelanggan.nama;

    final ok = await context.read<PengangkutanProvider>().quickPickup(
          targetId,
          lat: pos?.latitude,
          lng: pos?.longitude,
        );

    if (!mounted) return;

    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("✓ Pengambilan di $targetName berhasil dicatat!"),
          backgroundColor: const Color(0xFF00AA13), // Gojek Green
          duration: const Duration(seconds: 2),
        ),
      );

      // Auto tambah estimasi muatan truk
      if (_muatanTruk < 100) {
        setState(() => _muatanTruk = min(100, _muatanTruk + 5));
      }

      _selectNextTarget();
    }
  }

  void _showLewatiModal(TugasModel tugas) {
    String selectedStatus = 'tidak_diangkut';
    final controller = TextEditingController(text: 'Dilewati: Akses terhalang / Rumah tertutup');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                        style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close, color: Colors.white70),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text("Pilih Alasan Kendala:", style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 8),

                  RadioListTile<String>(
                    title: const Text("Tidak Diangkut (Akses / Masalah)", style: TextStyle(color: Colors.white)),
                    value: "tidak_diangkut",
                    groupValue: selectedStatus,
                    activeColor: AppColors.danger,
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          selectedStatus = val;
                          controller.text = "Tidak Diangkut: Akses terhalang / Jalan ditutup";
                        });
                      }
                    },
                  ),
                  RadioListTile<String>(
                    title: const Text("Rumah Kosong (Tidak ada sampah)", style: TextStyle(color: Colors.white)),
                    value: "kosong",
                    groupValue: selectedStatus,
                    activeColor: AppColors.warning,
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() {
                          selectedStatus = val;
                          controller.text = "Rumah Kosong: Pagar terkunci & nihil sampah";
                        });
                      }
                    },
                  ),

                  const SizedBox(height: 8),
                  TextField(
                    controller: controller,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      hintText: "Tuliskan keterangan detail...",
                      hintStyle: const TextStyle(color: Colors.white38),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),

                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      await context.read<PengangkutanProvider>().lewatiRumah(
                            tugas.id,
                            selectedStatus,
                            controller.text,
                          );
                      _selectNextTarget();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.warning,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Konfirmasi Lewati Rumah", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showTpaRitaseModal() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.fire_truck_rounded, color: Colors.amber),
            SizedBox(width: 10),
            Text("Ritase ke TPA", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Bak truk telah penuh dan menuju tempat pembuangan akhir (TPA Cipayung / TPS 3R)?",
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber, size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Mencatat ritase ini akan me-reset kapasitas muatan bak truk menjadi 0% untuk putaran berikutnya.",
                      style: TextStyle(color: Colors.white60, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Batal", style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () {
              setState(() => _muatanTruk = 0);
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("✓ Ritase TPA berhasil dicatat. Muatan truk dikosongkan (0%)."),
                  backgroundColor: Color(0xFF047857),
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.amber),
            child: const Text("Catat Ritase & Reset", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pengangkutan = context.watch<PengangkutanProvider>();
    final absensi = context.watch<AbsensiProvider>();
    final tracking = context.watch<TrackingProvider>();
    final auth = context.watch<AuthProvider>();

    final user = auth.user;
    final petugas = auth.petugas;

    final driverGeo = tracking.currentPosition;
    final driverPos = driverGeo != null
        ? LatLng(driverGeo.latitude, driverGeo.longitude)
        : _defaultCenter;

    // Cek proximity
    if (driverGeo != null) {
      _checkProximityAlert(driverPos);
    }

    final totalCount = pengangkutan.totalTugas;
    final completedCount = pengangkutan.totalSelesai;
    final percentComplete = totalCount > 0 ? ((completedCount / totalCount) * 100).round() : 0;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark Slate Background
      body: SafeArea(
        child: Column(
          children: [
            // ── 1. TOP COCKPIT BAR (Driver Telemetry & Controls) ──
            _buildTopCockpitBar(
              user: user,
              petugas: petugas,
              absensi: absensi,
              pendingOffline: pengangkutan.pendingOfflineCount,
              completedCount: completedCount,
              totalCount: totalCount,
              percentComplete: percentComplete,
            ),

            // ── 2. VIEW CONTENT (Peta Navigasi ATAU Daftar Tugas) ──
            Expanded(
              child: _activeView == "peta"
                  ? _buildMapView(driverPos, pengangkutan)
                  : _buildListView(pengangkutan),
            ),
          ],
        ),
      ),
    );
  }

  // ── 1. TOP COCKPIT HEADER ──
  Widget _buildTopCockpitBar({
    required dynamic user,
    required dynamic petugas,
    required AbsensiProvider absensi,
    required int pendingOffline,
    required int completedCount,
    required int totalCount,
    required int percentComplete,
  }) {
    final isAbsenMasuk = absensi.absensiHariIni?.sudahMasuk == true;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(bottom: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Identitas Driver & Armada
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFF00AA13).withValues(alpha: 0.2), // Gojek Green Tint
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF00AA13), width: 1.5),
                    ),
                    child: const Center(
                      child: Text("🚛", style: TextStyle(fontSize: 20)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.nama ?? "Driver Armada",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        petugas?.kelurahan != null ? "Wilayah ${petugas.kelurahan}" : "UPS HERU Depok",
                        style: const TextStyle(color: Colors.white60, fontSize: 11),
                      ),
                    ],
                  ),
                ],
              ),

              // Tombol Absen & Status Offline
              Row(
                children: [
                  if (pendingOffline > 0)
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade900,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_off_rounded, size: 12, color: Colors.white),
                          const SizedBox(width: 4),
                          Text("$pendingOffline offline", style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),

                  // Chip Absensi (1-tap buka kamera absen)
                  InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const AbsensiScreen()),
                    ),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isAbsenMasuk ? const Color(0xFF065F46) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isAbsenMasuk ? const Color(0xFF10B981) : Colors.white24,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            isAbsenMasuk ? Icons.check_circle_rounded : Icons.camera_alt_rounded,
                            size: 13,
                            color: isAbsenMasuk ? const Color(0xFF34D399) : Colors.white70,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            isAbsenMasuk ? "Shift Aktif" : "Absen",
                            style: TextStyle(
                              color: isAbsenMasuk ? Colors.white : Colors.white70,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 8),

                  // Menu Logout / Profil
                  IconButton(
                    icon: const Icon(Icons.logout_rounded, color: Colors.white54, size: 20),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => context.read<AuthProvider>().logout(),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Strip Bar 2: Durasi Kerja, Muatan Truk Selector, & View Switcher
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Timer & Progres Rumah
              Row(
                children: [
                  const Icon(Icons.timer_outlined, size: 13, color: Color(0xFF34D399)),
                  const SizedBox(width: 4),
                  Text(
                    _formatDuration(_tripSeconds),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "• $completedCount/$totalCount Rumah ($percentComplete%)",
                    style: const TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                ],
              ),

              // Muatan Truk Popup Selector
              Row(
                children: [
                  PopupMenuButton<int>(
                    initialValue: _muatanTruk,
                    onSelected: (val) => setState(() => _muatanTruk = val),
                    color: const Color(0xFF1E293B),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _muatanTruk >= 75
                            ? Colors.red.shade900
                            : (_muatanTruk >= 50 ? Colors.amber.shade900 : const Color(0xFF065F46)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.scale_rounded, size: 12, color: Colors.white),
                          const SizedBox(width: 4),
                          Text("Bak $_muatanTruk%", style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          const Icon(Icons.arrow_drop_down, size: 12, color: Colors.white70),
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

                  const SizedBox(width: 8),

                  // Toggle View Peta vs Daftar
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        InkWell(
                          onTap: () => setState(() => _activeView = "peta"),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: _activeView == "peta" ? const Color(0xFF00AA13) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(Icons.map_rounded, size: 16, color: _activeView == "peta" ? Colors.white : Colors.white60),
                          ),
                        ),
                        InkWell(
                          onTap: () => setState(() => _activeView = "daftar"),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                            decoration: BoxDecoration(
                              color: _activeView == "daftar" ? const Color(0xFF00AA13) : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(Icons.format_list_bulleted_rounded, size: 16, color: _activeView == "daftar" ? Colors.white : Colors.white60),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── 2. VIEW PETA INTERAKTIF (Gojek / Grab / Waze) ──
  Widget _buildMapView(LatLng driverPos, PengangkutanProvider pengangkutan) {
    final tasks = pengangkutan.tugasList;
    final isArrived = _hasAlertedCurrentTarget;

    // Markers builder
    final markers = <Marker>[];

    // Marker Driver Truk (Gojek Green Pulsing Radar)
    markers.add(
      Marker(
        point: driverPos,
        width: 50,
        height: 50,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF00AA13).withValues(alpha: 0.25),
                border: Border.all(color: const Color(0xFF00AA13), width: 2),
              ),
            ),
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF00AA13),
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3))],
              ),
              child: const Center(
                child: Text("🚛", style: TextStyle(fontSize: 18)),
              ),
            ),
          ],
        ),
      ),
    );

    // Filter stop pelanggan
    final pendingStops = tasks.where((t) => t.isTerjadwal && t.pelanggan.hasCoordinates).toList();
    final completedStops = tasks.where((t) => t.isSelesai && t.pelanggan.hasCoordinates).toList();

    // 1. Selesai -> Dot hijau mini redup
    for (final t in completedStops) {
      markers.add(
        Marker(
          point: LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!),
          width: 14,
          height: 14,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF059669).withValues(alpha: 0.5),
              border: Border.all(color: Colors.white70, width: 1.2),
            ),
          ),
        ),
      );
    }

    // 2. Pending stops (Target aktif & Upcoming)
    for (int i = 0; i < pendingStops.length; i++) {
      final t = pendingStops[i];
      final isTarget = _activeTarget?.id == t.id;
      final isUpcoming = !isTarget && i < 4;
      final isMenunggak = t.tunggakan.isMenunggak;

      if (isTarget) {
        // Target Aktif: Balon Waze / Pin Besar Berdenyut + Label Nama
        markers.add(
          Marker(
            point: LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!),
            width: 120,
            height: 64,
            child: GestureDetector(
              onTap: () => setState(() => _activeTarget = t),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isMenunggak ? const Color(0xFF991B1B) : const Color(0xFF00AA13),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white, width: 1.5),
                      boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 6)],
                    ),
                    child: Text(
                      t.pelanggan.nama,
                      style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isMenunggak ? AppColors.danger : const Color(0xFF00AA13),
                      border: Border.all(color: Colors.yellow, width: 2.5),
                      boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8)],
                    ),
                    child: Center(
                      child: Text(
                        isMenunggak ? "⛔" : "#${t.urutan ?? (i + 1)}",
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      } else if (isUpcoming) {
        // 4 Stop Mendatang: Pin Bernomor
        markers.add(
          Marker(
            point: LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!),
            width: 28,
            height: 28,
            child: GestureDetector(
              onTap: () {
                setState(() => _activeTarget = t);
                _fetchRoadRoute();
              },
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isMenunggak ? AppColors.danger : const Color(0xFF0284C7),
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
                ),
                child: Center(
                  child: Text(
                    "${t.urutan ?? (i + 1)}",
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ),
        );
      } else {
        // Antrean Jauh: Titik Halus
        markers.add(
          Marker(
            point: LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!),
            width: 14,
            height: 14,
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isMenunggak ? AppColors.danger.withValues(alpha: 0.7) : const Color(0xFF0284C7).withValues(alpha: 0.7),
                border: Border.all(color: Colors.white, width: 1.5),
              ),
            ),
          ),
        );
      }
    }

    return Stack(
      children: [
        // 1. KANVAS PETA LEAFLET / OSM
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: driverPos,
            initialZoom: 16.0,
            maxZoom: 19.0,
            minZoom: 11.0,
          ),
          children: [
            TileLayer(
              urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
              userAgentPackageName: "com.wastepay.petugas",
            ),

            // Garis Jalan OSRM Driving Route
            if (_currentRoadRoute != null && _currentRoadRoute!.points.isNotEmpty)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: _currentRoadRoute!.points,
                    color: const Color(0xFF0284C7),
                    strokeWidth: 5.0,
                  ),
                ],
              )
            else if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates)
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

        // 2. BANNER WAZE TURN-BY-TURN NAVIGATION (ATAS)
        if (_activeTarget != null)
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isArrived
                    ? const Color(0xFF047857) // Emerald Arrived
                    : const Color(0xFF0284C7), // Navigating Blue
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 3))],
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
                      isArrived ? Icons.location_on_rounded : Icons.navigation_rounded,
                      color: Colors.white,
                      size: 20,
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
                                  : "Menuju: ${_activeTarget!.pelanggan.nama}"),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (_currentRoadRoute != null)
                          Text(
                            "${_currentRoadRoute!.formattedDistance} • ${_currentRoadRoute!.formattedDuration}",
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                      ],
                    ),
                  ),
                  if (_isLoadingRoute)
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    ),
                ],
              ),
            ),
          ),

        // 3. FLOATING ACTION BUTTONS (KANAN)
        Positioned(
          right: 12,
          bottom: 240,
          child: Column(
            children: [
              // Buka Waze / Google Maps Eksternal
              FloatingActionButton.small(
                heroTag: "navChooser",
                backgroundColor: const Color(0xFF0284C7),
                onPressed: () {
                  if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates) {
                    ExternalNavigationService.showNavigationChooser(
                      context,
                      lat: _activeTarget!.pelanggan.latitude!,
                      lng: _activeTarget!.pelanggan.longitude!,
                      namaPelanggan: _activeTarget!.pelanggan.nama,
                      alamat: _activeTarget!.pelanggan.alamat,
                    );
                  }
                },
                child: const Icon(Icons.near_me_rounded, color: Colors.white),
              ),
              const SizedBox(height: 8),

              // Ritase TPA Modal
              FloatingActionButton.small(
                heroTag: "tpaBtn",
                backgroundColor: Colors.amber.shade800,
                onPressed: _showTpaRitaseModal,
                tooltip: "Ritase ke TPA",
                child: const Icon(Icons.fire_truck_rounded, color: Colors.white),
              ),
              const SizedBox(height: 8),

              // Recenter GPS
              FloatingActionButton.small(
                heroTag: "recenterBtn",
                backgroundColor: const Color(0xFF1E293B),
                onPressed: _recenterCamera,
                child: const Icon(Icons.my_location_rounded, color: Colors.white),
              ),
              const SizedBox(height: 8),

              // Fit Bounds
              FloatingActionButton.small(
                heroTag: "fitBoundsBtn",
                backgroundColor: const Color(0xFF1E293B),
                onPressed: _fitAllStops,
                child: const Icon(Icons.zoom_out_map_rounded, color: Colors.white),
              ),
            ],
          ),
        ),

        // 4. BOTTOM FLOATING SHEET (Gojek / Grab Style Cockpit)
        Positioned(
          left: 12,
          right: 12,
          bottom: 12,
          child: _activeTarget != null
              ? _buildTargetBottomSheet(_activeTarget!)
              : _buildEmptyTargetSheet(),
        ),
      ],
    );
  }

  // ── 3. BOTTOM TARGET SHEET (Gojek & Grab Mitra Style) ──
  Widget _buildTargetBottomSheet(TugasModel t) {
    final isMenunggak = t.tunggakan.isMenunggak;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.96),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isMenunggak ? Colors.red.shade700 : const Color(0xFF334155),
          width: isMenunggak ? 1.5 : 1.0,
        ),
        boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 16, offset: Offset(0, 4))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Baris 1: Urutan Stop & Nama Pelanggan
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isMenunggak ? const Color(0xFF991B1B) : const Color(0xFF00AA13),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  "#${t.urutan ?? 1}",
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      t.pelanggan.nama,
                      style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w800),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      t.pelanggan.alamat,
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Tombol Detail Form
              IconButton(
                icon: const Icon(Icons.edit_note_rounded, color: Colors.white70),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PengangkutanDetailScreen(tugas: t),
                    ),
                  );
                },
              ),
            ],
          ),

          // Peringatan Tunggakan jika ada
          if (isMenunggak) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.red.shade900.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.shade400, width: 0.8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.yellow, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Warga menunggak ${t.tunggakan.jumlahBulan} bulan (Total: Rp ${t.tunggakan.totalNominal.round()})",
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Baris 2: Quick Action Bar (WhatsApp, Telepon, Lewati)
          Row(
            children: [
              // WhatsApp Warga
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    DriverActionsService.openWhatsApp(
                      phone: t.pelanggan.noTelepon,
                      nama: t.pelanggan.nama,
                      alamat: t.pelanggan.alamat,
                      patokan: t.pelanggan.patokanLokasi,
                      isMenunggak: isMenunggak,
                    );
                  },
                  icon: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 16),
                  label: const Text("WhatsApp", style: TextStyle(color: Colors.white, fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF334155)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Panggilan Telepon
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => DriverActionsService.makePhoneCall(t.pelanggan.noTelepon),
                  icon: const Icon(Icons.call_rounded, color: Colors.lightBlueAccent, size: 16),
                  label: const Text("Telepon", style: TextStyle(color: Colors.white, fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF334155)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Lewati / Kendala
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _showLewatiModal(t),
                  icon: const Icon(Icons.skip_next_rounded, color: Colors.amber, size: 16),
                  label: const Text("Lewati", style: TextStyle(color: Colors.white, fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF334155)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Baris 3: SlideToConfirm / Swipe-to-Pickup Slider (Gojek / Grab)
          SwipeToPickupSlider(
            onConfirmed: _handleConfirmPickup,
            label: "Geser Selesai Angkut 🚛",
            confirmedLabel: "Berhasil Diangkut! ✓",
            isMenunggak: isMenunggak,
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyTargetSheet() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.check_circle_outline, color: Color(0xFF34D399), size: 24),
          SizedBox(width: 10),
          Text(
            "Semua rute penjemputan selesai hari ini! 🎉",
            style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  // ── 4. VIEW DAFTAR / CHECKLIST TUGAS ──
  Widget _buildListView(PengangkutanProvider pengangkutan) {
    final list = pengangkutan.filteredList;

    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          // Search Bar
          TextField(
            controller: _searchController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            onChanged: (val) => pengangkutan.setSearchQuery(val),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF1E293B),
              hintText: "Cari nama warga, alamat, kode pelanggan...",
              hintStyle: const TextStyle(color: Colors.white38, fontSize: 13),
              prefixIcon: const Icon(Icons.search, color: Colors.white54, size: 20),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Colors.white54, size: 18),
                      onPressed: () {
                        _searchController.clear();
                        pengangkutan.setSearchQuery('');
                      },
                    )
                  : null,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          ),

          const SizedBox(height: 10),

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip("semua", "Semua (${pengangkutan.totalTugas})", pengangkutan),
                const SizedBox(width: 8),
                _buildFilterChip("terjadwal", "Terjadwal (${pengangkutan.totalTerjadwal})", pengangkutan),
                const SizedBox(width: 8),
                _buildFilterChip("diambil", "Selesai (${pengangkutan.totalSelesai})", pengangkutan),
                const SizedBox(width: 8),
                _buildFilterChip("dilewati", "Dilewati (${pengangkutan.totalDilewati})", pengangkutan),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // List Items
          Expanded(
            child: list.isEmpty
                ? const Center(
                    child: Text("Tidak ada tugas ditemukan", style: TextStyle(color: Colors.white54)),
                  )
                : ListView.builder(
                    itemCount: list.length,
                    itemBuilder: (ctx, i) {
                      final t = list[i];
                      return Card(
                        color: const Color(0xFF1E293B),
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF00AA13),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          "#${t.urutan ?? (i + 1)}",
                                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        t.pelanggan.nama,
                                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700),
                                      ),
                                    ],
                                  ),
                                  StatusBadge(status: t.status),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                t.pelanggan.alamat,
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  if (t.pelanggan.hasCoordinates)
                                    IconButton(
                                      icon: const Icon(Icons.near_me_rounded, color: Color(0xFF38BDF8), size: 20),
                                      tooltip: "Buka Navigasi Waze / Maps",
                                      onPressed: () {
                                        ExternalNavigationService.showNavigationChooser(
                                          context,
                                          lat: t.pelanggan.latitude!,
                                          lng: t.pelanggan.longitude!,
                                          namaPelanggan: t.pelanggan.nama,
                                          alamat: t.pelanggan.alamat,
                                        );
                                      },
                                    ),
                                  IconButton(
                                    icon: const Icon(Icons.chat_rounded, color: Color(0xFF25D366), size: 20),
                                    tooltip: "WhatsApp Warga",
                                    onPressed: () {
                                      DriverActionsService.openWhatsApp(
                                        phone: t.pelanggan.noTelepon,
                                        nama: t.pelanggan.nama,
                                        alamat: t.pelanggan.alamat,
                                        patokan: t.pelanggan.patokanLokasi,
                                        isMenunggak: t.tunggakan.isMenunggak,
                                      );
                                    },
                                  ),
                                  if (t.isTerjadwal)
                                    ElevatedButton(
                                      onPressed: () async {
                                        await pengangkutan.quickPickup(t.id);
                                      },
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF00AA13),
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                      ),
                                      child: const Text("1-Tap Pickup", style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String key, String label, PengangkutanProvider p) {
    final isSelected = p.selectedFilter == key;
    return ChoiceChip(
      label: Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.white70, fontSize: 12)),
      selected: isSelected,
      selectedColor: const Color(0xFF00AA13),
      backgroundColor: const Color(0xFF1E293B),
      onSelected: (_) => p.setFilter(key),
    );
  }
}
