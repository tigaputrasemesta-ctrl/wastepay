import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../providers/admin_provider.dart';

class AdminPetaArmadaScreen extends StatefulWidget {
  const AdminPetaArmadaScreen({super.key});

  @override
  State<AdminPetaArmadaScreen> createState() => _AdminPetaArmadaScreenState();
}

class _AdminPetaArmadaScreenState extends State<AdminPetaArmadaScreen> {
  final MapController _mapController = MapController();
  static const LatLng _defaultCenter = LatLng(-6.424838, 106.832667); // Depok Cilodong

  @override
  Widget build(BuildContext context) {
    final admin = context.watch<AdminProvider>();
    final customers = admin.displayedPelanggan.where((p) => p.hasCoordinates).toList();

    // 3 Posisi Armada Statis / Estimasi Wilayah Depok
    final armadaMarkers = [
      const LatLng(-6.4150, 106.8280), // Ago (B 1999 HRR)
      const LatLng(-6.4320, 106.8350), // Piat (B 2000 HRR)
      const LatLng(-6.4210, 106.8420), // Raka (B 2021 HRR)
    ];

    final markers = <Marker>[];

    // Marker Pelanggan dari Cache Memori HP
    for (final c in customers) {
      markers.add(
        Marker(
          point: LatLng(c.latitude!, c.longitude!),
          width: 14,
          height: 14,
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: c.status == 'aktif' ? const Color(0xFF00AA13) : const Color(0xFFF59E0B),
              border: Border.all(color: Colors.white, width: 1.2),
            ),
          ),
        ),
      );
    }

    // Marker 3 Truk Armada
    final armadaNames = ["Ago (B 1999 HRR)", "Piat (B 2000 HRR)", "Raka (B 2021 HRR)"];
    for (int i = 0; i < armadaMarkers.length; i++) {
      markers.add(
        Marker(
          point: armadaMarkers[i],
          width: 80,
          height: 48,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF38BDF8), width: 1),
                ),
                child: Text(
                  armadaNames[i],
                  style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                  maxLines: 1,
                ),
              ),
              const Text("🚛", style: TextStyle(fontSize: 18)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text(
          "Peta Monitor Armada & Warga",
          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: _defaultCenter,
              initialZoom: 14.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'id.o2whero.admin',
                maxZoom: 19,
              ),
              MarkerLayer(markers: markers),
            ],
          ),

          // Top Info Pill
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withValues(alpha: 0.9),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Titik Koordinat: ${customers.length} Warga",
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const Text(
                    "3 Armada Aktif",
                    style: TextStyle(color: Color(0xFF4ADE80), fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
