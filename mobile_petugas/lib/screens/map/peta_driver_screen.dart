import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../models/tugas_model.dart';
import '../../providers/pengangkutan_provider.dart';
import '../../providers/tracking_provider.dart';
import '../pengangkutan/pengangkutan_detail_screen.dart';

class PetaDriverScreen extends StatefulWidget {
  final int? initialRuteId;
  final String? initialRuteNama;

  const PetaDriverScreen({
    super.key,
    this.initialRuteId,
    this.initialRuteNama,
  });

  @override
  State<PetaDriverScreen> createState() => _PetaDriverScreenState();
}

class _PetaDriverScreenState extends State<PetaDriverScreen> {
  final MapController _mapController = MapController();
  TugasModel? _selectedTugas;
  bool _filterHanyaBelumSelesai = false;

  // Koordinat default Depok / Cilodong jika GPS belum terdeteksi
  static const LatLng _defaultCenter = LatLng(-6.424838, 106.832667);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PengangkutanProvider>().loadTugas();
      context.read<TrackingProvider>().startTracking();
    });
  }

  void _centerToDriver(LatLng driverPos) {
    _mapController.move(driverPos, 16.0);
  }

  void _centerToCustomer(TugasModel tugas) {
    if (tugas.pelanggan.hasCoordinates) {
      final pos = LatLng(tugas.pelanggan.latitude!, tugas.pelanggan.longitude!);
      _mapController.move(pos, 17.0);
      setState(() {
        _selectedTugas = tugas;
      });
    }
  }

  Future<void> _openGoogleMapsNavigation(TugasModel tugas) async {
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
    } else {
      final encoded = Uri.encodeComponent(tugas.pelanggan.alamat);
      final uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=$encoded");
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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

    // Filter daftar tugas pelanggan yang memiliki koordinat
    final allTugas = pengangkutan.tugasList;
    final filteredTugas = allTugas.where((t) {
      if (!t.pelanggan.hasCoordinates) return false;
      if (_filterHanyaBelumSelesai && t.isSelesai) return false;
      return true;
    }).toList();

    // Buat Polyline urutan jemput
    final polylinePoints = <LatLng>[];
    if (driverGeo != null) {
      polylinePoints.add(driverPos);
    }
    for (final t in filteredTugas) {
      if (!t.isSelesai) {
        polylinePoints.add(LatLng(t.pelanggan.latitude!, t.pelanggan.longitude!));
      }
    }

    // Buat daftar marker
    final markers = <Marker>[];

    // 1. Marker Posisi Truk Driver
    markers.add(
      Marker(
        point: driverPos,
        width: 52,
        height: 52,
        child: GestureDetector(
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text("Posisi Armada Truk Anda (Live GPS)"),
                duration: Duration(seconds: 2),
                behavior: SnackBarBehavior.floating,
              ),
            );
          },
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary.withValues(alpha: 0.25),
                ),
              ),
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primaryDark,
                  border: Border.all(color: Colors.white, width: 2.5),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 6,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.local_shipping_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ],
          ),
        ),
      ),
    );

    // 2. Marker Rumah / Titik Jemput Pelanggan
    for (int i = 0; i < filteredTugas.length; i++) {
      final tugas = filteredTugas[i];
      final pos = LatLng(tugas.pelanggan.latitude!, tugas.pelanggan.longitude!);
      final isSelected = _selectedTugas?.id == tugas.id;

      Color markerColor;
      IconData markerIcon;
      if (tugas.isSelesai) {
        markerColor = AppColors.success;
        markerIcon = Icons.check_circle_rounded;
      } else if (tugas.isDilewati) {
        markerColor = AppColors.warning;
        markerIcon = Icons.cancel_rounded;
      } else if (tugas.tunggakan.isMenunggak && !tugas.tunggakan.bolehPickup) {
        markerColor = AppColors.danger;
        markerIcon = Icons.warning_rounded;
      } else {
        markerColor = AppColors.primary;
        markerIcon = Icons.delete_outline_rounded;
      }

      markers.add(
        Marker(
          point: pos,
          width: isSelected ? 48 : 38,
          height: isSelected ? 48 : 38,
          child: GestureDetector(
            onTap: () => _centerToCustomer(tugas),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: markerColor,
                border: Border.all(
                  color: isSelected ? Colors.yellowAccent : Colors.white,
                  width: isSelected ? 3 : 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: isSelected ? 8 : 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Icon(
                markerIcon,
                color: Colors.white,
                size: isSelected ? 24 : 18,
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.initialRuteNama ?? "Peta Rute Driver",
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            Text(
              "${filteredTugas.length} Titik Jemput Pelanggan",
              style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.normal),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              _filterHanyaBelumSelesai ? Icons.filter_alt_rounded : Icons.filter_alt_outlined,
              color: _filterHanyaBelumSelesai ? Colors.amber : Colors.white,
            ),
            tooltip: _filterHanyaBelumSelesai ? "Tampilkan Semua" : "Hanya Belum Angkut",
            onPressed: () {
              setState(() {
                _filterHanyaBelumSelesai = !_filterHanyaBelumSelesai;
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Muat Ulang Data",
            onPressed: () => pengangkutan.loadTugas(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // 1. Peta Interaktif FlutterMap (OpenStreetMap)
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: driverGeo != null ? driverPos : _defaultCenter,
              initialZoom: 15.0,
              minZoom: 5.0,
              maxZoom: 18.0,
              onTap: (_, __) {
                if (_selectedTugas != null) {
                  setState(() {
                    _selectedTugas = null;
                  });
                }
              },
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'id.o2whero.lapangan',
                maxZoom: 19,
              ),
              if (polylinePoints.length > 1)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: polylinePoints,
                      color: AppColors.primary.withValues(alpha: 0.8),
                      strokeWidth: 3.5,
                      borderStrokeWidth: 1.5,
                      borderColor: Colors.white.withValues(alpha: 0.7),
                    ),
                  ],
                ),
              MarkerLayer(markers: markers),
            ],
          ),

          // 2. Chip Ringkasan di Atas
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
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
                                color: AppColors.primaryDark,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              "Truk Live",
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
                            ),
                          ],
                        ),
                        Text(
                          "Selesai: ${pengangkutan.totalSelesai} / ${pengangkutan.totalTugas}",
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 3. Tombol Floating Action (Lokasi Saya & Zoom)
          Positioned(
            right: 16,
            bottom: _selectedTugas != null ? 220 : 30,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: "fab_my_loc",
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primaryDark,
                  tooltip: "Lokasi Saya",
                  onPressed: () {
                    if (driverGeo != null) {
                      _centerToDriver(driverPos);
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Menunggu sinyal GPS armada...")),
                      );
                    }
                  },
                  child: const Icon(Icons.my_location_rounded),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: "fab_zoom_in",
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textPrimary,
                  tooltip: "Perbesar",
                  onPressed: () {
                    final z = _mapController.camera.zoom;
                    _mapController.move(_mapController.camera.center, z + 1);
                  },
                  child: const Icon(Icons.add),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: "fab_zoom_out",
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textPrimary,
                  tooltip: "Perkecil",
                  onPressed: () {
                    final z = _mapController.camera.zoom;
                    _mapController.move(_mapController.camera.center, z - 1);
                  },
                  child: const Icon(Icons.remove),
                ),
              ],
            ),
          ),

          // 4. Panel Informasi Titik Jemput yang Dipilih
          if (_selectedTugas != null)
            Positioned(
              left: 12,
              right: 12,
              bottom: 20,
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: _selectedTugas!.isSelesai
                                        ? AppColors.successBg
                                        : AppColors.primarySurface,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    _selectedTugas!.isSelesai
                                        ? Icons.check_circle_rounded
                                        : Icons.home_rounded,
                                    color: _selectedTugas!.isSelesai
                                        ? AppColors.success
                                        : AppColors.primaryDark,
                                    size: 18,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _selectedTugas!.pelanggan.nama,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 20),
                            onPressed: () => setState(() => _selectedTugas = null),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _selectedTugas!.pelanggan.alamat,
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (_selectedTugas!.pelanggan.patokanLokasi != null) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.near_me_outlined, size: 13, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                "Patokan: ${_selectedTugas!.pelanggan.patokanLokasi}",
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppColors.primaryDark,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _openGoogleMapsNavigation(_selectedTugas!),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.teal.shade700,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              icon: const Icon(Icons.navigation_rounded, size: 16),
                              label: const Text("Navigasi Driving", style: TextStyle(fontSize: 12)),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => PengangkutanDetailScreen(tugas: _selectedTugas!),
                                  ),
                                );
                              },
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                              icon: const Icon(Icons.checklist_rounded, size: 16),
                              label: const Text("Detail & Lapor", style: TextStyle(fontSize: 12)),
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
