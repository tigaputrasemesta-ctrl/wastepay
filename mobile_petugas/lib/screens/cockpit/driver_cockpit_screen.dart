import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
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
import '../../widgets/task_card.dart';
import '../absensi/absensi_screen.dart';
import '../komplain/keluhan_pelanggan_screen.dart';
import '../pengangkutan/pengangkutan_detail_screen.dart';

/// Layar Utama Driver Cockpit & Navigasi Operasional
/// Fitur Lengkap:
/// - Fullscreen Immersive Map (Google Maps / Dark / OSM Tiles)
/// - Validasi Ketat Geofence: Hanya bisa selesaikan tugas di radius <= 20 meter
/// - Toggle Mode Rute: Rute Terurut (TSP) vs Pickup Bebas / Acak (Random)
/// - Toggle View: Peta Interaktif vs Daftar Pelanggan (dengan Foto Rumah & Zona)
/// - Akses Langsung ke Halaman Keluhan / Pengaduan Pelanggan
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

  // State Tampilan & Mode Operasional
  String _activeView = 'peta'; // 'peta' atau 'daftar'
  bool _isRandomMode = false; // false = Rute Terurut, true = Pickup Bebas / Acak
  String _mapLayer = 'google_street'; // 'google_street', 'google_satellite', 'dark', 'street'
  bool _isOnline = true; // Toggle Siap Angkut (Online / Offline)
  bool _isStarted = false; // State Tombol START / STOP Operasi

  // Center Reticle Pin (Badhy Maps Style)
  LatLng _mapCenter = const LatLng(-6.4025, 106.7942);
  bool _isDraggingMap = false;
  Timer? _dragDebounceTimer;

  // Search & Filter state
  bool _isSearching = false;
  List<TugasModel> _searchResults = [];
  String _selectedZona = 'semua';
  String _listStatusFilter = 'semua'; // 'semua', 'terjadwal', 'diambil', 'dilewati'

  // Target Pelanggan & Routing
  TugasModel? _activeTarget;
  RouteResult? _currentRoadRoute;
  bool _isLoadingRoute = false;

  // Proximity Alert Geofence (20 meter)
  bool _hasAlertedCurrentTarget = false;
  static const double _arrivalRadiusMeters = 20.0;

  // Telemetri Trip Driver
  Timer? _tripTimer;
  int _tripSeconds = 0;
  int _muatanTruk = 25; // persentase 0-100%

  // Floating Mini Widget (Draggable)
  bool _showFloatingWidget = true;
  Offset _floatingWidgetPosition = const Offset(20, 150);

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
      TugasModel nextTarget;
      if (_isRandomMode) {
        // Mode Acak/Bebas: Otomatis pilih yang terdekat dari posisi armada saat ini
        final tracking = context.read<TrackingProvider>();
        final pos = tracking.currentPosition;
        if (pos != null) {
          pending.sort((a, b) {
            final da = a.pelanggan.hasCoordinates
                ? _calculateDistance(pos.latitude, pos.longitude, a.pelanggan.latitude!, a.pelanggan.longitude!)
                : 9999999.0;
            final db = b.pelanggan.hasCoordinates
                ? _calculateDistance(pos.latitude, pos.longitude, b.pelanggan.latitude!, b.pelanggan.longitude!)
                : 9999999.0;
            return da.compareTo(db);
          });
        }
        nextTarget = pending.first;
      } else {
        // Mode Rute Terurut (TSP Sequential)
        nextTarget = pending.first;
      }

      setState(() {
        _activeTarget = nextTarget;
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
          content: Text('📍 Tiba di radius 20m: ${_activeTarget!.pelanggan.nama}. Tombol SELESAI aktif!'),
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
      final zona = t.pelanggan.zonaNama?.toLowerCase() ?? '';
      return nama.contains(q) || alamat.contains(q) || kode.contains(q) || patokan.contains(q) || zona.contains(q);
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
      _searchController.clear();
      _hasAlertedCurrentTarget = false;
      _activeView = 'peta'; // Otomatis alihkan ke peta untuk navigasi
    });
    _searchFocusNode.unfocus();

    if (target.pelanggan.hasCoordinates) {
      final point = LatLng(target.pelanggan.latitude!, target.pelanggan.longitude!);
      _mapController.move(point, 18.0);
      setState(() => _mapCenter = point);
      _fetchRoadRoute();
    }
  }

  void _showRadiusAlert(double distanceMeters, String namaPelanggan) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Colors.redAccent, width: 1.5)),
        title: const Row(
          children: [
            Icon(Icons.gpp_bad_rounded, color: Colors.redAccent, size: 28),
            SizedBox(width: 10),
            Text("Di Luar Radius 20m", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Jarak armada ke rumah $namaPelanggan: ${distanceMeters.toStringAsFixed(1)} meter.",
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.redAccent.withValues(alpha: 0.4)),
              ),
              child: const Text(
                "🔒 Aturan Lapangan: Petugas hanya dapat menyelesaikan pengangkutan di radius maksimal 20 meter dari lokasi rumah pelanggan.",
                style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00AA13)),
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Mengerti, Dekati Lokasi", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _handleConfirmPickup() async {
    if (_activeTarget == null) return;

    final tracking = context.read<TrackingProvider>();
    final pos = tracking.currentPosition;
    final targetId = _activeTarget!.id;
    final targetName = _activeTarget!.pelanggan.nama;

    // VALIDASI KETAT: Radius maksimal 20 meter dari rumah pelanggan
    if (_activeTarget!.pelanggan.hasCoordinates) {
      if (pos == null) {
        HapticFeedback.vibrate();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("⚠️ Sinyal GPS tidak terdeteksi. Aktifkan GPS untuk verifikasi radius 20m."),
            backgroundColor: Color(0xFFDC2626),
          ),
        );
        return;
      }

      final dist = _calculateDistance(
        pos.latitude,
        pos.longitude,
        _activeTarget!.pelanggan.latitude!,
        _activeTarget!.pelanggan.longitude!,
      );

      if (dist > _arrivalRadiusMeters) {
        HapticFeedback.vibrate();
        _showRadiusAlert(dist, targetName);
        return;
      }
    }

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
          content: Text('✓ Penjemputan di $targetName berhasil dicatat!'),
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

  void _showFotoRumahModal(String fotoStr, String namaPelanggan) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white24),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 48, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "🏠 Foto Rumah Pelanggan",
                          style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          namaPelanggan,
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                    child: InteractiveViewer(
                      panEnabled: true,
                      minScale: 0.8,
                      maxScale: 4.0,
                      child: fotoStr.startsWith('data:image')
                          ? Image.memory(
                              base64Decode(fotoStr.split(',').last),
                              height: 340,
                              width: double.infinity,
                              fit: BoxFit.contain,
                            )
                          : Image.network(
                              fotoStr,
                              height: 340,
                              width: double.infinity,
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const SizedBox(
                                height: 180,
                                child: Center(child: Icon(Icons.home, color: Colors.white38, size: 48)),
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              padding: const EdgeInsets.all(12),
              icon: const Icon(Icons.close_rounded, color: Colors.white, size: 26),
              onPressed: () => Navigator.pop(ctx),
            ),
          ],
        ),
      ),
    );
  }

  void _showFavoritesSheet() {
    final tasks = context.read<PengangkutanProvider>().tugasList;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.70,
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
                    '⭐ Antrean Titik Penjemputan',
                    style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
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
                    final hasFoto = t.pelanggan.fotoRumah != null && t.pelanggan.fotoRumah!.isNotEmpty;

                    return ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: GestureDetector(
                        onTap: () {
                          if (hasFoto) {
                            _showFotoRumahModal(t.pelanggan.fotoRumah!, t.pelanggan.nama);
                          }
                        },
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isCurrent ? const Color(0xFF00AA13) : Colors.white24),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(9),
                            child: hasFoto
                                ? (t.pelanggan.fotoRumah!.startsWith('data:image')
                                    ? Image.memory(base64Decode(t.pelanggan.fotoRumah!.split(',').last), fit: BoxFit.cover)
                                    : Image.network(t.pelanggan.fotoRumah!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.home, color: Colors.white54)))
                                : Container(
                                    color: Colors.white10,
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
                          ),
                        ),
                      ),
                      title: Row(
                        children: [
                          Expanded(
                            child: Text(
                              t.pelanggan.nama,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13.5),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (t.pelanggan.zonaNama != null) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF6366F1).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                t.pelanggan.zonaNama!,
                                style: const TextStyle(color: Color(0xFFA5B4FC), fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ],
                      ),
                      subtitle: Text(
                        t.pelanggan.alamat,
                        style: const TextStyle(color: Colors.white60, fontSize: 11.5),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      trailing: Icon(
                        Icons.navigation_rounded,
                        color: isCurrent ? const Color(0xFF00AA13) : Colors.white38,
                        size: 20,
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
                leading: const Icon(Icons.map_rounded, color: Color(0xFF38BDF8)),
                title: const Text('Google Maps (Jalan & Bangunan Standar)', style: TextStyle(color: Colors.white)),
                subtitle: const Text('Detail gang komplek & nama jalan sangat jelas', style: TextStyle(color: Colors.white54, fontSize: 11)),
                trailing: _mapLayer == 'google_street' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'google_street');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Icon(Icons.satellite_alt_rounded, color: Colors.lightGreenAccent),
                title: const Text('Google Satelit Hybrid', style: TextStyle(color: Colors.white)),
                subtitle: const Text('Foto satelit asli dengan garis jalan raya', style: TextStyle(color: Colors.white54, fontSize: 11)),
                trailing: _mapLayer == 'google_satellite' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'google_satellite');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Icon(Icons.nightlight_round, color: Color(0xFF818CF8)),
                title: const Text('Tactical Dark HUD (Mode Malam)', style: TextStyle(color: Colors.white)),
                subtitle: const Text('Peta gelap CartoDB kontras tinggi', style: TextStyle(color: Colors.white54, fontSize: 11)),
                trailing: _mapLayer == 'dark' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'dark');
                  Navigator.pop(ctx);
                },
              ),
              ListTile(
                leading: const Icon(Icons.public_rounded, color: Colors.amber),
                title: const Text('OpenStreetMap Standar', style: TextStyle(color: Colors.white)),
                subtitle: const Text('Peta komunitas global OSM', style: TextStyle(color: Colors.white54, fontSize: 11)),
                trailing: _mapLayer == 'street' ? const Icon(Icons.check, color: Color(0xFF00AA13)) : null,
                onTap: () {
                  setState(() => _mapLayer = 'street');
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
      case 'google_satellite':
        return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      case 'street':
        return 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      case 'dark':
        return 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      case 'google_street':
      default:
        return 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
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

    // Hitung jarak ke target aktif
    double? activeTargetDistance;
    bool isTargetWithin20m = false;
    if (_activeTarget != null && _activeTarget!.pelanggan.hasCoordinates && driverGeo != null) {
      activeTargetDistance = _calculateDistance(
        driverGeo.latitude,
        driverGeo.longitude,
        _activeTarget!.pelanggan.latitude!,
        _activeTarget!.pelanggan.longitude!,
      );
      isTargetWithin20m = activeTargetDistance <= _arrivalRadiusMeters;
    }

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
          width: isCurrent ? 84 : 32,
          height: isCurrent ? 64 : 32,
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
                          color: isMenunggak ? const Color(0xFFDC2626) : const Color(0xFF00AA13),
                          border: Border.all(color: Colors.white, width: 2.2),
                          boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 6)],
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
          // ── 1. KANVAS PETA FULLSCREEN ATAU DAFTAR PELANGGAN ──
          if (_activeView == 'peta')
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
                    _dragDebounceTimer = Timer(const Duration(milliseconds: 200), () {
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
            )
          else
            _buildDaftarPelangganView(pengangkutan, driverGeo),

          // ── CENTER RETICLE PIN DENGAN ANIMASI ELEVASI (Khusus View Peta) ──
          if (_activeView == 'peta')
            Center(
              child: IgnorePointer(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  transform: Matrix4.translationValues(0, _isDraggingMap ? -20 : -10, 0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white24, width: 1),
                          boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 8)],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
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
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(Icons.location_on, color: Color(0xFF00AA13), size: 46),
                          Container(
                            width: 12,
                            height: 12,
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                          ),
                        ],
                      ),
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

          // ── TOP FLOATING CONTROL HEADER (Search, View Toggle, Mode Acak) ──
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 12,
            right: 12,
            child: Column(
              children: [
                // Bar 1: Switcher View (Peta vs Daftar) & Switcher Mode (Terurut vs Acak)
                Row(
                  children: [
                    // View Toggle: PETA vs DAFTAR
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A).withValues(alpha: 0.96),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white24),
                      ),
                      child: Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _activeView = 'peta');
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: _activeView == 'peta' ? const Color(0xFF00AA13) : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.map_rounded, size: 14, color: _activeView == 'peta' ? Colors.white : Colors.white60),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Peta',
                                    style: TextStyle(
                                      color: _activeView == 'peta' ? Colors.white : Colors.white70,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _activeView = 'daftar');
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: _activeView == 'daftar' ? const Color(0xFF00AA13) : Colors.transparent,
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                children: [
                                  Icon(Icons.format_list_bulleted_rounded, size: 14, color: _activeView == 'daftar' ? Colors.white : Colors.white60),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Daftar Warga',
                                    style: TextStyle(
                                      color: _activeView == 'daftar' ? Colors.white : Colors.white70,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Toggle Mode Acak / Bebas vs Terurut
                    GestureDetector(
                      onTap: () {
                        HapticFeedback.mediumImpact();
                        setState(() {
                          _isRandomMode = !_isRandomMode;
                        });
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              _isRandomMode
                                  ? '🔀 Mode Pickup Acak / Bebas AKTIF: Bebas pilih rumah mana saja!'
                                  : '⚡ Mode Rute Terurut AKTIF: Navigasi searah rute terjadwal.',
                            ),
                            backgroundColor: _isRandomMode ? const Color(0xFF6366F1) : const Color(0xFF00AA13),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                        _selectNextTarget();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: _isRandomMode ? const Color(0xFF4F46E5) : const Color(0xFF0F172A).withValues(alpha: 0.96),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _isRandomMode ? const Color(0xFF818CF8) : Colors.white24),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _isRandomMode ? Icons.shuffle_rounded : Icons.alt_route_rounded,
                              size: 14,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              _isRandomMode ? 'Mode Acak' : 'Mode Urut',
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(width: 6),

                    // Tombol Keluhan Warga
                    GestureDetector(
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const KeluhanPelangganScreen()),
                        );
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDC2626),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.report_problem_rounded, size: 14, color: Colors.white),
                            SizedBox(width: 4),
                            Text('Keluhan', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),

                // Bar 2: Search Pill & Driver Status
                Container(
                  height: 50,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A).withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(25),
                    border: Border.all(color: Colors.white24, width: 1.2),
                    boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 10, offset: Offset(0, 3))],
                  ),
                  child: Row(
                    children: [
                      const SizedBox(width: 14),
                      const Icon(Icons.search_rounded, color: Color(0xFF00AA13), size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _searchController,
                          focusNode: _searchFocusNode,
                          onChanged: _onSearchQueryChanged,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: const InputDecoration(
                            hintText: 'Cari nama, alamat, atau zona...',
                            hintStyle: TextStyle(color: Colors.white54, fontSize: 12),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                      if (_searchController.text.isNotEmpty)
                        IconButton(
                          icon: const Icon(Icons.close_rounded, color: Colors.white70, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchQueryChanged('');
                          },
                        ),
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
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: _isOnline ? const Color(0xFF065F46) : const Color(0xFF334155),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _isOnline ? const Color(0xFF10B981) : Colors.white24),
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
                                  fontSize: 10.5,
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

                // Dropdown Autocomplete
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

          // ── RIGHT FLOATING ACTION BUTTONS (Khusus View Peta) ──
          if (_activeView == 'peta')
            Positioned(
              right: 14,
              top: MediaQuery.of(context).padding.top + 120,
              child: Column(
                children: [
                  _buildFloatingButton(
                    icon: Icons.my_location_rounded,
                    tooltip: 'Lokasi Armada Driver',
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
                    tooltip: 'Antrean Titik Drop',
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
                    tooltip: 'Muat Ulang',
                    onTap: () => context.read<PengangkutanProvider>().loadTugas(),
                  ),
                ],
              ),
            ),

          // ── FLOATING MINI WIDGET OVERLAY (Draggable) ──
          if (_showFloatingWidget && _activeTarget != null && _activeView == 'peta')
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
                            activeTargetDistance != null
                                ? '${activeTargetDistance.round()}m lagi • Muatan: $_muatanTruk%'
                                : 'Muatan: $_muatanTruk%',
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

          // ── BOTTOM FLOATING CONTROL CARD (Khusus View Peta) ──
          if (_activeView == 'peta')
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
                  boxShadow: const [BoxShadow(color: Colors.black54, blurRadius: 20, offset: Offset(0, 6))],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Row 1: Status & Telemetri
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

                    // Row 2: Informasi Target Aktif (Foto Rumah, Nama, Alamat, Zona, Jarak)
                    if (_activeTarget != null) ...[
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Thumbnail Foto Rumah Pelanggan
                          GestureDetector(
                            onTap: () {
                              if (_activeTarget!.pelanggan.fotoRumah != null &&
                                  _activeTarget!.pelanggan.fotoRumah!.isNotEmpty) {
                                _showFotoRumahModal(_activeTarget!.pelanggan.fotoRumah!, _activeTarget!.pelanggan.nama);
                              }
                            },
                            child: Container(
                              width: 56,
                              height: 56,
                              margin: const EdgeInsets.only(right: 10),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white30),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(11),
                                child: _activeTarget!.pelanggan.fotoRumah != null &&
                                        _activeTarget!.pelanggan.fotoRumah!.isNotEmpty
                                    ? (_activeTarget!.pelanggan.fotoRumah!.startsWith('data:image')
                                        ? Image.memory(
                                            base64Decode(_activeTarget!.pelanggan.fotoRumah!.split(',').last),
                                            fit: BoxFit.cover,
                                          )
                                        : Image.network(
                                            _activeTarget!.pelanggan.fotoRumah!,
                                            fit: BoxFit.cover,
                                            errorBuilder: (_, __, ___) => const Icon(Icons.home, color: Colors.white54),
                                          ))
                                    : Container(
                                        color: Colors.white10,
                                        child: const Center(
                                          child: Icon(Icons.home_rounded, color: Colors.white54, size: 24),
                                        ),
                                      ),
                              ),
                            ),
                          ),

                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        _activeTarget!.pelanggan.nama,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (_activeTarget!.pelanggan.zonaNama != null)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFF6366F1).withValues(alpha: 0.25),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          _activeTarget!.pelanggan.zonaNama!,
                                          style: const TextStyle(color: Color(0xFFA5B4FC), fontSize: 10, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  _activeTarget!.pelanggan.alamat,
                                  style: const TextStyle(color: Colors.white60, fontSize: 11.5),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: isTargetWithin20m
                                            ? const Color(0xFF00AA13).withValues(alpha: 0.2)
                                            : Colors.amber.withValues(alpha: 0.2),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        activeTargetDistance != null
                                            ? (isTargetWithin20m
                                                ? '📍 Di Radius: ${activeTargetDistance.round()}m (Siap Selesai)'
                                                : '📏 Jarak: ${activeTargetDistance.round()}m (Wajib < 20m)')
                                            : 'Menghitung jarak...',
                                        style: TextStyle(
                                          color: isTargetWithin20m ? const Color(0xFF34D399) : Colors.amber,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          // Quick Action Buttons (Google Maps & WA)
                          Row(
                            children: [
                              IconButton(
                                icon: const Icon(Icons.navigation_rounded, color: Color(0xFF38BDF8), size: 22),
                                tooltip: 'Buka Navigasi Google Maps',
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
                                icon: const Icon(Icons.chat_bubble_rounded, color: Color(0xFF25D366), size: 22),
                                tooltip: 'WhatsApp Warga',
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

                    // Row 3: Tombol START/STOP & Konfirmasi SELESAI
                    Row(
                      children: [
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
                              _isStarted ? 'STOP OPERASI' : 'MULAI ANGKUT',
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
                          Expanded(
                            flex: 3,
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isTargetWithin20m ? const Color(0xFF00AA13) : const Color(0xFF334155),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: BorderSide(
                                    color: isTargetWithin20m ? const Color(0xFF34D399) : Colors.white24,
                                  ),
                                ),
                                elevation: isTargetWithin20m ? 6 : 2,
                              ),
                              icon: Icon(
                                isTargetWithin20m ? Icons.check_circle_rounded : Icons.lock_outline_rounded,
                                size: 18,
                              ),
                              label: Text(
                                isTargetWithin20m ? '✓ SELESAI' : '🔒 < 20m',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              onPressed: _handleConfirmPickup,
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

  /// Tampilan Khusus Tab "Daftar Pelanggan"
  Widget _buildDaftarPelangganView(PengangkutanProvider provider, Position? driverGeo) {
    final allZonas = provider.tugasList
        .map((t) => t.pelanggan.zonaNama)
        .where((z) => z != null && z.isNotEmpty)
        .cast<String>()
        .toSet()
        .toList();

    var list = provider.tugasList;
    if (_listStatusFilter == 'terjadwal') {
      list = list.where((t) => t.isTerjadwal).toList();
    } else if (_listStatusFilter == 'diambil') {
      list = list.where((t) => t.isSelesai).toList();
    } else if (_listStatusFilter == 'dilewati') {
      list = list.where((t) => t.isDilewati).toList();
    }

    if (_selectedZona != 'semua') {
      list = list.where((t) => t.pelanggan.zonaNama == _selectedZona).toList();
    }

    if (_searchController.text.isNotEmpty) {
      final q = _searchController.text.toLowerCase();
      list = list.where((t) {
        final nama = t.pelanggan.nama.toLowerCase();
        final alamat = t.pelanggan.alamat.toLowerCase();
        final kode = t.pelanggan.kodePelanggan.toLowerCase();
        return nama.contains(q) || alamat.contains(q) || kode.contains(q);
      }).toList();
    }

    return Container(
      color: const Color(0xFF0F172A),
      margin: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 105),
      child: Column(
        children: [
          // Filter Tabs Status
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildListStatusChip('semua', 'Semua (${provider.totalTugas})'),
                  const SizedBox(width: 8),
                  _buildListStatusChip('terjadwal', 'Terjadwal (${provider.totalTerjadwal})'),
                  const SizedBox(width: 8),
                  _buildListStatusChip('diambil', 'Selesai (${provider.totalSelesai})'),
                  const SizedBox(width: 8),
                  _buildListStatusChip('dilewati', 'Dilewati (${provider.totalDilewati})'),
                ],
              ),
            ),
          ),

          // Filter Zona
          if (allZonas.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    const Text('Zona: ', style: TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
                    _buildZonaFilterChip('semua', 'Semua Zona'),
                    ...allZonas.map((z) => _buildZonaFilterChip(z, z)),
                  ],
                ),
              ),
            ),

          // List Task Cards
          Expanded(
            child: list.isEmpty
                ? const Center(
                    child: Text(
                      'Tidak ada pelanggan di filter ini.',
                      style: TextStyle(color: Colors.white60, fontSize: 13),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, idx) {
                      final tugas = list[idx];
                      double? dist;
                      if (driverGeo != null && tugas.pelanggan.hasCoordinates) {
                        dist = _calculateDistance(
                          driverGeo.latitude,
                          driverGeo.longitude,
                          tugas.pelanggan.latitude!,
                          tugas.pelanggan.longitude!,
                        );
                      }

                      return TaskCard(
                        tugas: tugas,
                        index: idx,
                        driverDistanceMeters: dist,
                        onSelectAsTarget: () => _selectSearchResult(tugas),
                        onQuickPickup: () async {
                          setState(() => _activeTarget = tugas);
                          await _handleConfirmPickup();
                        },
                        onDetailTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => PengangkutanDetailScreen(tugas: tugas)),
                        ),
                        onLewatiTap: (st, al) => context.read<PengangkutanProvider>().lewatiRumah(tugas.id, st, al),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildListStatusChip(String key, String label) {
    final isSelected = _listStatusFilter == key;
    return GestureDetector(
      onTap: () => setState(() => _listStatusFilter = key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF00AA13) : Colors.white10,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isSelected ? const Color(0xFF00AA13) : Colors.white24),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Widget _buildZonaFilterChip(String key, String label) {
    final isSelected = _selectedZona == key;
    return GestureDetector(
      onTap: () => setState(() => _selectedZona = key),
      child: Container(
        margin: const EdgeInsets.only(right: 6),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF6366F1) : Colors.white10,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.white70,
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
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
