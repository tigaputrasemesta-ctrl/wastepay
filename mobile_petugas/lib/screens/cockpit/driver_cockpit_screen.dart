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
import '../absensi/absensi_screen.dart';
import '../pengangkutan/pengangkutan_detail_screen.dart';

/// Layar Driver Cockpit & Peta Penjemputan Sampah
/// Dirombak total mengadopsi desain & logika maps OXN VIP / Badhy Maps:
/// - Fullscreen Immersive Map (Edge-to-Edge)
/// - Floating Search Pill dengan Autocomplete
/// - Center Crosshair Pin dengan Animasi Elevasi & Koordinat Live
/// - Floating Action Buttons di sisi kanan (Recenter, Layer, Favorite, Fit Bounds)
/// - Bottom Glassmorphic Card dengan Tombol START/STOP Menonjol & Aksi Cepat
/// - Draggable Floating Mini Widget
class DriverCockpitScreen extends StatefulWidget {
  const DriverCockpitScreen({super.key});

  @override
  State<DriverCockpitScreen> createState() => _DriverCockpitScreenState();
}

class _DriverCockpitScreenState extends State<DriverCockpitScreen>
    with WidgetsBindingObserver, SingleTickerProviderStateMixin {
  final MapController _mapController = MapController();
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  // State Peta & Mode Layer
  String _mapLayer = 'dark'; // 'dark', 'street', 'satellite'
  bool _isOnline = true; // Toggle Siap Angkut (Online / Offline)
  bool _isStarted = false; // State Tombol START / STOP Operasi

  // Center Reticle Pin (Badhy Maps Style)
  LatLng _mapCenter = const LatLng(-6.4025, 106.7942);
  bool _isDraggingMap = false;
  Timer? _dragDebounceTimer;

  // Search state
  bool _isSearching = false;
  List<TugasModel> _searchResults = [];

  // Target Pelanggan & Routing
  TugasModel? _activeTarget;
  RouteResult? _currentRoadRoute;
  bool _isLoadingRoute = false;

  // Proximity Alert Geofence (30 meter)
  bool _hasAlertedCurrentTarget = false;
  static const double _arrivalRadiusMeters = 30.0;

  // Telemetri Trip Driver
  Timer? _tripTimer;
  int _tripSeconds = 0;
  int _muatanTruk = 25; // persentase 0-100%

  // Floating Mini Widget (Draggable)
  bool _showFloatingWidget = true;
  Offset _floatingWidgetPosition = const Offset(20, 140);

  // Pusat default Kota Depok
  static const LatLng _defaultCenter = LatLng(-6.4025, 106.7942);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Timer trip operasional
    _tripTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _isStarted) {
        setState(() => _tripSeconds++);
      }
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initDriverSession();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tripTimer?.cancel();
    _dragDebounceTimer?.cancel();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  void _initDriverSession() async {
    final auth = context.read<AuthProvider>();
    if (auth.petugas != null) {
      context.read<TrackingProvider>().setContextIds(petugasId: auth.petugas!.id);
      if (_isOnline) {
        context.read<TrackingProvider>().startTracking();
      }
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
    final start = driverPos != null
        ? LatLng(driverPos.latitude, driverPos.longitude)
        : _mapCenter;
    final end = LatLng(_activeTarget!.pelanggan.latitude!, _activeTarget!.pelanggan.longitude!);

    setState(() => _isLoadingRoute = true);
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
          content: Text('📍 Tiba di lokasi target: ${_activeTarget!.pelanggan.nama}'),
          backgroundColor: const Color(0xFF00AA13),
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
    if (h > 0) return '${h}j ${m.toString().padLeft(2, '0')}m';
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void _recenterToDriver() {
    final tracking = context.read<TrackingProvider>();
    final pos = tracking.currentPosition;
    if (pos != null) {
      final target = LatLng(pos.latitude, pos.longitude);
      _mapController.move(target, 17.5);
      setState(() => _mapCenter = target);
    } else {
      _mapController.move(_defaultCenter, 16.0);
      setState(() => _mapCenter = _defaultCenter);
    }
  }

  void _recenterToActiveTarget() {
    if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates) {
      final point = LatLng(_activeTarget!.pelanggan.latitude!, _activeTarget!.pelanggan.longitude!);
      _mapController.move(point, 18.0);
      setState(() => _mapCenter = point);
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
      _mapController.fitCamera(CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(50)));
    }
  }

  void _onSearchQueryChanged(String query) {
    final tasks = context.read<PengangkutanProvider>().tugasList;
    if (query.trim().isEmpty) {
      setState(() {
        _isSearching = false;
        _searchResults = [];
      });
      return;
    }

    final q = query.toLowerCase();
    final matched = tasks.where((t) {
      final nama = t.pelanggan.nama.toLowerCase();
      final alamat = t.pelanggan.alamat.toLowerCase();
      final kode = t.pelanggan.kodePelanggan.toLowerCase();
      final patokan = t.pelanggan.patokanLokasi?.toLowerCase() ?? '';
      return nama.contains(q) || alamat.contains(q) || kode.contains(q) || patokan.contains(q);
    }).toList();

    setState(() {
      _isSearching = true;
      _searchResults = matched;
    });
  }

  void _selectSearchResult(TugasModel target) {
    setState(() {
      _activeTarget = target;
      _isSearching = false;
      _searchController.text = target.pelanggan.nama;
    });
    _searchFocusNode.unfocus();

    if (target.pelanggan.hasCoordinates) {
      final point = LatLng(target.pelanggan.latitude!, target.pelanggan.longitude!);
      _mapController.move(point, 18.0);
      setState(() => _mapCenter = point);
      _fetchRoadRoute();
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
          lat: pos?.latitude ?? _mapCenter.latitude,
          lng: pos?.longitude ?? _mapCenter.longitude,
        );

    if (!mounted) return;

    if (ok) {
      HapticFeedback.heavyImpact();
      SystemSound.play(SystemSoundType.click);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('✓ Penjemputan di $targetName berhasil!'),
          backgroundColor: const Color(0xFF00AA13),
          duration: const Duration(seconds: 2),
        ),
      );

      setState(() {
        _muatanTruk = min(100, _muatanTruk + 15);
      });

      _selectNextTarget();
    }
  }

  void _showFavoritesSheet() {
    final tasks = context.read<PengangkutanProvider>().tugasList;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.65,
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '⭐ Titik Antrean / Drop Point',
                    style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w800),
                  ),
                  Text(
                    '${tasks.length} Lokasi',
                    style: const TextStyle(color: Color(0xFF00AA13), fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.separated(
                  itemCount: tasks.length,
                  separatorBuilder: (_, __) => const Divider(color: Colors.white10),
                  itemBuilder: (ctx, i) {
                    final t = tasks[i];
                    final isCurrent = _activeTarget?.id == t.id;
                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: t.isSelesai
                              ? const Color(0xFF00AA13).withValues(alpha: 0.2)
                              : isCurrent
                                  ? const Color(0xFF0284C7).withValues(alpha: 0.2)
                                  : Colors.white10,
                          border: Border.all(
                            color: t.isSelesai
                                ? const Color(0xFF00AA13)
                                : isCurrent
                                    ? const Color(0xFF0284C7)
                                    : Colors.white24,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            t.isSelesai ? '✓' : '#${t.urutan ?? (i + 1)}',
                            style: TextStyle(
                              color: t.isSelesai ? const Color(0xFF00AA13) : Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                      title: Text(
                        t.pelanggan.nama,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      subtitle: Text(
                        t.pelanggan.alamat,
                        style: const TextStyle(color: Colors.white60, fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Icon(
                        Icons.chevron_right_rounded,
                        color: isCurrent ? const Color(0xFF00AA13) : Colors.white38,
                      ),
                      onTap: () {
                        Navigator.pop(ctx);
                        _selectSearchResult(t);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showLayerSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Color(0xFF0F172A),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                '🗺️ Pilih Tampilan Peta',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: const Icon(Icons.dark_mode_rounded, color: Color(0xFF38BDF8)),
                title: const Text('Dark Tactical (Waze Style)', style: TextStyle(color: Colors.white)),
                trailing: _mapLayer == 'dark' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'dark');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Icon(Icons.map_rounded, color: Colors.amber),
                title: const Text('Street Normal (OSM)', style: TextStyle(color: Colors.white)),
                trailing: _mapLayer == 'street' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'street');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Icon(Icons.satellite_alt_rounded, color: Colors.lightGreenAccent),
                title: const Text('Satellite Hybrid (Google)', style: TextStyle(color: Colors.white)),
                trailing: _mapLayer == 'satellite' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'satellite');
                  Navigator.pop(ctx);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  String _getTileUrl() {
    switch (_mapLayer) {
      case 'satellite':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'street':
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'dark':
      default:
        return 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    }
  }

  @override
  Widget build(BuildContext context) {
    final tracking = context.watch<TrackingProvider>();
    final pengangkutan = context.watch<PengangkutanProvider>();

    final driverGeo = tracking.currentPosition;
    final driverPos = driverGeo != null
        ? LatLng(driverGeo.latitude, driverGeo.longitude)
        : _defaultCenter;

    if (driverGeo != null) {
      _checkProximityAlert(driverPos);
    }

    final double speedKmH = (driverGeo?.speed ?? 0.0) * 3.6;

    // Markers
    final markers = <Marker>[];

    // 1. Marker Armada Truk Driver
    markers.add(
      Marker(
        point: driverPos,
        width: 52,
        height: 52,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF00AA13).withValues(alpha: 0.25),
                border: Border.all(color: const Color(0xFF00AA13), width: 2),
              ),
            ),
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF00AA13),
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3))],
              ),
              child: const Center(
                child: Text('🚛', style: TextStyle(fontSize: 20)),
              ),
            ),
          ],
        ),
      ),
    );

    // 2. Marker Seluruh Rumah Pelanggan
    for (int i = 0; i < pengangkutan.tugasList.length; i++) {
      final t = pengangkutan.tugasList[i];
      if (!t.pelanggan.hasCoordinates) continue;

      final isCurrent = _activeTarget?.id == t.id;
      final isDone = t.isSelesai;
      final isMenunggak = t.tunggakan.isMenunggak;

      markers.add(
        Marker(
          point: LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!),
          width: isCurrent ? 80 : 32,
          height: isCurrent ? 60 : 32,
          child: GestureDetector(
            onTap: () {
              setState(() => _activeTarget = t);
              _fetchRoadRoute();
            },
            child: isCurrent
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: isMenunggak ? const Color(0xFF991B1B) : const Color(0xFF00AA13),
                          borderRadius: BorderRadius.circular(10),
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
                          color: isMenunggak ? Colors.red.shade700 : const Color(0xFF00AA13),
                          border: Border.all(color: Colors.yellowAccent, width: 2.5),
                          boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8)],
                        ),
                        child: Center(
                          child: Text(
                            '#${t.urutan ?? (i + 1)}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900),
                          ),
                        ),
                      ),
                    ],
                  )
                : Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDone
                          ? const Color(0xFF059669)
                          : isMenunggak
                              ? Colors.red.shade800
                              : const Color(0xFF0284C7),
                      border: Border.all(color: Colors.white, width: 1.8),
                      boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
                    ),
                    child: Center(
                      child: Text(
                        isDone ? '✓' : '${t.urutan ?? (i + 1)}',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // ── KANVAS PETA FULLSCREEN (Edge-to-Edge) ──
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _mapCenter,
              initialZoom: 16.5,
              maxZoom: 19.5,
              minZoom: 10.0,
              onPositionChanged: (camera, hasGesture) {
                if (hasGesture) {
                  if (!_isDraggingMap) {
                    setState(() => _isDraggingMap = true);
                  }
                  _dragDebounceTimer?.cancel();
                  _dragDebounceTimer = Timer(const Duration(milliseconds: 250), () {
                    if (mounted) {
                      setState(() {
                        _isDraggingMap = false;
                        _mapCenter = camera.center;
                      });
                    }
                  });
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: _getTileUrl(),
                userAgentPackageName: 'id.o2whero.lapangan',
              ),

              // Garis Rute Jalan Raya OSRM
              if (_currentRoadRoute != null && _currentRoadRoute!.points.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _currentRoadRoute!.points,
                      color: const Color(0xFF00AA13),
                      strokeWidth: 6.0,
                    ),
                  ],
                ),

              MarkerLayer(markers: markers),
            ],
          ),

          // ── CENTER RETICLE PIN DENGAN ANIMASI ELEVASI (Badhy Maps) ──
          Center(
            child: IgnorePointer(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                transform: Matrix4.translationValues(0, _isDraggingMap ? -20 : -10, 0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Badge Koordinat Live di Atas Pin
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF00AA13), width: 1.5),
                        boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 8)],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFF00AA13),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '${_mapCenter.latitude.toStringAsFixed(5)}, ${_mapCenter.longitude.toStringAsFixed(5)}',
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Ikon Pin Badhy Maps
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        const Icon(
                          Icons.location_on,
                          color: Color(0xFF00AA13),
                          size: 46,
                        ),
                        Container(
                          width: 12,
                          height: 12,
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    // Bayangan di Bawah Pin
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: _isDraggingMap ? 8 : 16,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: _isDraggingMap ? 0.2 : 0.5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // ── TOP FLOATING SEARCH BAR & AUTOCOMPLETE (Badhy Pill Style) ──
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 14,
            right: 14,
            child: Column(
              children: [
                Container(
                  height: 52,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(26),
                    border: Border.all(color: Colors.white24, width: 1.2),
                    boxShadow: const [
                      BoxShadow(color: Colors.black45, blurRadius: 12, offset: Offset(0, 4)),
                    ],
                  ),
                  child: Row(
                    children: [
                      const SizedBox(width: 14),
                      const Icon(Icons.search_rounded, color: Color(0xFF00AA13), size: 24),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          focusNode: _searchFocusNode,
                          onChanged: _onSearchQueryChanged,
                          style: const TextStyle(color: Colors.white, fontSize: 14),
                          decoration: const InputDecoration(
                            hintText: 'Cari alamat, nasabah, atau kode...',
                            hintStyle: TextStyle(color: Colors.white54, fontSize: 13),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                      if (_searchController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 20),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchQueryChanged('');
                          },
                        ),
                      // Indikator Status Driver Online
                      GestureDetector(
                        onTap: () {
                          setState(() => _isOnline = !_isOnline);
                          HapticFeedback.selectionClick();
                          if (_isOnline) {
                            context.read<TrackingProvider>().startTracking();
                          } else {
                            context.read<TrackingProvider>().stopTracking();
                          }
                        },
                        child: Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: _isOnline ? const Color(0xFF065F46) : const Color(0xFF334155),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: _isOnline ? const Color(0xFF10B981) : Colors.white24,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: _isOnline ? const Color(0xFF34D399) : Colors.amber,
                                ),
                              ),
                              const SizedBox(width: 5),
                              Text(
                                _isOnline ? 'ON' : 'OFF',
                                style: TextStyle(
                                  color: _isOnline ? const Color(0xFF34D399) : Colors.white70,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Dropdown Autocomplete Search Results
                if (_isSearching && _searchResults.isNotEmpty)
                  Container(
                    margin: const EdgeInsets.only(top: 8),
                    constraints: const BoxConstraints(maxHeight: 240),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A).withValues(alpha: 0.98),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                      boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 16)],
                    ),
                    child: ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shrinkWrap: true,
                      itemCount: _searchResults.length,
                      separatorBuilder: (_, __) => const Divider(color: Colors.white10, height: 1),
                      itemBuilder: (ctx, idx) {
                        final item = _searchResults[idx];
                        return ListTile(
                          dense: true,
                          leading: const Icon(Icons.location_on, color: Color(0xFF00AA13), size: 20),
                          title: Text(item.pelanggan.nama, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          subtitle: Text(item.pelanggan.alamat, style: const TextStyle(color: Colors.white60, fontSize: 11), maxLines: 1),
                          onTap: () => _selectSearchResult(item),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),

          // ── RIGHT FLOATING ACTION BUTTONS (Badhy FAB Column) ──
          Positioned(
            right: 14,
            top: MediaQuery.of(context).padding.top + 80,
            child: Column(
              children: [
                _buildFloatingButton(
                  icon: Icons.my_location_rounded,
                  tooltip: 'Lokasi Driver Saya',
                  onTap: _recenterToDriver,
                ),
                const SizedBox(height: 10),
                _buildFloatingButton(
                  icon: Icons.layers_rounded,
                  tooltip: 'Ganti Layer Peta',
                  onTap: _showLayerSelector,
                ),
                const SizedBox(height: 10),
                _buildFloatingButton(
                  icon: Icons.star_rounded,
                  color: Colors.amber,
                  tooltip: 'Daftar Drop Point',
                  onTap: _showFavoritesSheet,
                ),
                const SizedBox(height: 10),
                _buildFloatingButton(
                  icon: Icons.fullscreen_rounded,
                  tooltip: 'Lihat Semua Rute',
                  onTap: _fitAllStops,
                ),
                const SizedBox(height: 10),
                _buildFloatingButton(
                  icon: Icons.refresh_rounded,
                  tooltip: 'Refresh Data',
                  onTap: () => context.read<PengangkutanProvider>().loadTugas(),
                ),
              ],
            ),
          ),

          // ── FLOATING MINI WIDGET OVERLAY (Draggable) ──
          if (_showFloatingWidget && _activeTarget != null)
            Positioned(
              left: _floatingWidgetPosition.dx,
              top: _floatingWidgetPosition.dy,
              child: GestureDetector(
                onPanUpdate: (details) {
                  setState(() {
                    _floatingWidgetPosition += details.delta;
                  });
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF00AA13), width: 1.5),
                    boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 10)],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🚛', style: TextStyle(fontSize: 18)),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _activeTarget!.pelanggan.nama,
                            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Muatan: $_muatanTruk%',
                            style: const TextStyle(color: Color(0xFF34D399), fontSize: 10),
                          ),
                        ],
                      ),
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: () => setState(() => _showFloatingWidget = false),
                        child: const Icon(Icons.close, color: Colors.white54, size: 14),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // ── BOTTOM FLOATING CONTROL CARD (Badhy Control Sheet) ──
          Positioned(
            bottom: 14,
            left: 14,
            right: 14,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withValues(alpha: 0.96),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white24, width: 1.2),
                boxShadow: const [
                  BoxShadow(color: Colors.black54, blurRadius: 20, offset: Offset(0, 6)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Row 1: Status & Telemetri Real-Time
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _isStarted
                                  ? const Color(0xFF00AA13).withValues(alpha: 0.2)
                                  : Colors.white10,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _isStarted ? const Color(0xFF00AA13) : Colors.white24,
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  _isStarted ? Icons.play_arrow_rounded : Icons.pause_rounded,
                                  color: _isStarted ? const Color(0xFF00AA13) : Colors.white70,
                                  size: 14,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _isStarted ? 'SEDANG JALAN' : 'STANDBY',
                                  style: TextStyle(
                                    color: _isStarted ? const Color(0xFF00AA13) : Colors.white70,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '⏱️ ${_formatDuration(_tripSeconds)}',
                            style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      Text(
                        '⚡ ${speedKmH.toStringAsFixed(0)} km/j',
                        style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Row 2: Informasi Target Aktif
                  if (_activeTarget != null) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _activeTarget!.pelanggan.nama,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                _activeTarget!.pelanggan.alamat,
                                style: const TextStyle(color: Colors.white60, fontSize: 12),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                        // Quick Action Buttons (Navigasi GMaps/Waze & WA)
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.navigation_rounded, color: Color(0xFF38BDF8)),
                              tooltip: 'Buka Google Maps / Waze',
                              onPressed: () {
                                if (_activeTarget!.pelanggan.hasCoordinates) {
                                  ExternalNavigationService.showNavigationChooser(
                                    context,
                                    lat: _activeTarget!.pelanggan.latitude!,
                                    lng: _activeTarget!.pelanggan.longitude!,
                                    namaPelanggan: _activeTarget!.pelanggan.nama,
                                    alamat: _activeTarget!.pelanggan.alamat,
                                  );
                                }
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF25D366)),
                              tooltip: 'WhatsApp Nasabah',
                              onPressed: () {
                                DriverActionsService.openWhatsApp(
                                  phone: _activeTarget!.pelanggan.noTelepon,
                                  nama: _activeTarget!.pelanggan.nama,
                                  alamat: _activeTarget!.pelanggan.alamat,
                                  patokan: _activeTarget!.pelanggan.patokanLokasi,
                                  isMenunggak: _activeTarget!.tunggakan.isMenunggak,
                                );
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ] else ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8),
                      child: Text(
                        'Semua antrean penjemputan sampah hari ini sudah selesai!',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],

                  const SizedBox(height: 14),

                  // Row 3: Tombol START / STOP & Selesai Angkut (Badhy Vibrant Buttons)
                  Row(
                    children: [
                      // Tombol Toggle START / STOP
                      Expanded(
                        flex: 4,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _isStarted ? const Color(0xFFDC2626) : const Color(0xFF00AA13),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 6,
                          ),
                          icon: Icon(_isStarted ? Icons.stop_rounded : Icons.play_arrow_rounded, size: 22),
                          label: Text(
                            _isStarted ? 'STOP OPERASI' : 'MULAI ANGKUT (START)',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                          ),
                          onPressed: () {
                            HapticFeedback.heavyImpact();
                            setState(() {
                              _isStarted = !_isStarted;
                            });
                            if (_isStarted) {
                              _recenterToActiveTarget();
                              _fetchRoadRoute();
                            }
                          },
                        ),
                      ),

                      if (_activeTarget != null) ...[
                        const SizedBox(width: 10),
                        // Tombol Cepat Konfirmasi Pickup
                        Expanded(
                          flex: 3,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0284C7),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: 4,
                            ),
                            onPressed: _handleConfirmPickup,
                            child: const Text(
                              '✓ SELESAI',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingButton({
    required IconData icon,
    required VoidCallback onTap,
    String? tooltip,
    Color color = Colors.white,
  }) {
    return Container(
      width: 46,
      height: 46,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.9),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white24, width: 1.2),
        boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3))],
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 22),
        tooltip: tooltip,
        onPressed: () {
          HapticFeedback.selectionClick();
          onTap();
        },
      ),
    );
  }
}
