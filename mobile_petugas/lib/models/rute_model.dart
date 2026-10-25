class JadwalModel {
  final int id;
  final String hari;
  final String? jam;
  final bool aktif;
  final int pelangganId;
  final String pelangganNama;
  final String pelangganAlamat;
  final String? pelangganNoTelepon;
  final String? pelangganFotoRumah;
  final String? pelangganPatokan;
  final double? latitude;
  final double? longitude;
  final int? ruteId;
  final String? ruteNama;

  JadwalModel({
    required this.id,
    required this.hari,
    this.jam,
    this.aktif = true,
    required this.pelangganId,
    required this.pelangganNama,
    required this.pelangganAlamat,
    this.pelangganNoTelepon,
    this.pelangganFotoRumah,
    this.pelangganPatokan,
    this.latitude,
    this.longitude,
    this.ruteId,
    this.ruteNama,
  });

  factory JadwalModel.fromJson(Map<String, dynamic> json) {
    final pelanggan = json['pelanggan'] as Map<String, dynamic>? ?? {};
    final rute = json['rute'] as Map<String, dynamic>? ?? {};

    return JadwalModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      hari: json['hari']?.toString() ?? '',
      jam: json['jam']?.toString(),
      aktif: json['aktif'] == true || json['aktif'] == 'true',
      pelangganId: pelanggan['id'] is int
          ? pelanggan['id']
          : int.tryParse(json['pelangganId']?.toString() ?? '0') ?? 0,
      pelangganNama: pelanggan['nama']?.toString() ?? 'Pelanggan #${json['pelangganId']}',
      pelangganAlamat: pelanggan['alamat']?.toString() ?? '-',
      pelangganNoTelepon: pelanggan['noTelepon']?.toString(),
      pelangganFotoRumah: pelanggan['fotoRumah']?.toString(),
      pelangganPatokan: pelanggan['patokanLokasi']?.toString(),
      latitude: (pelanggan['latitude'] as num?)?.toDouble(),
      longitude: (pelanggan['longitude'] as num?)?.toDouble(),
      ruteId: json['ruteId'] is int
          ? json['ruteId']
          : (rute['id'] is int ? rute['id'] : null),
      ruteNama: rute['nama']?.toString(),
    );
  }

  bool get hasCoordinates => latitude != null && longitude != null && latitude != 0 && longitude != 0;
}

class RuteModel {
  final int id;
  final String nama;
  final String hari;
  final String? jam;
  final bool aktif;
  final int? kelurahanId;
  final String? kelurahanNama;
  final String? kecamatan;
  final int? zonaId;
  final String? zonaNama;
  final int? petugasId;
  final String? petugasNama;
  final int? kendaraanId;
  final String? kendaraanNama;
  final String? kendaraanJenis;
  final String? platNomor;
  final int totalJadwal;
  final List<JadwalModel> jadwal;

  RuteModel({
    required this.id,
    required this.nama,
    required this.hari,
    this.jam,
    this.aktif = true,
    this.kelurahanId,
    this.kelurahanNama,
    this.kecamatan,
    this.zonaId,
    this.zonaNama,
    this.petugasId,
    this.petugasNama,
    this.kendaraanId,
    this.kendaraanNama,
    this.kendaraanJenis,
    this.platNomor,
    this.totalJadwal = 0,
    this.jadwal = const [],
  });

  factory RuteModel.fromJson(Map<String, dynamic> json) {
    final kelurahan = json['kelurahan'] as Map<String, dynamic>?;
    final kelurahans = json['kelurahans'] as List?;
    final zona = json['zona'] as Map<String, dynamic>?;
    final zonas = json['zonas'] as List?;
    final petugas = json['petugas'] as Map<String, dynamic>?;
    final kendaraan = json['kendaraan'] as Map<String, dynamic>?;
    final count = json['_count'] as Map<String, dynamic>?;

    String? kelurahanNama = kelurahan?['nama']?.toString();
    String? kecamatan = kelurahan?['kecamatan']?.toString();
    if ((kelurahanNama == null || kelurahanNama.isEmpty) && kelurahans != null && kelurahans.isNotEmpty) {
      final names = kelurahans
          .map((k) => k is Map ? k['nama']?.toString() : null)
          .where((s) => s != null && s.isNotEmpty)
          .join(', ');
      if (names.isNotEmpty) kelurahanNama = names;
      final firstK = kelurahans.first as Map<String, dynamic>?;
      if (kecamatan == null || kecamatan.isEmpty) {
        kecamatan = firstK?['kecamatan']?.toString();
      }
    }

    String? zonaNama = zona?['nama']?.toString();
    if ((zonaNama == null || zonaNama.isEmpty) && zonas != null && zonas.isNotEmpty) {
      final zNames = zonas
          .map((z) => z is Map ? z['nama']?.toString() : null)
          .where((s) => s != null && s.isNotEmpty)
          .join(', ');
      if (zNames.isNotEmpty) zonaNama = zNames;
    }

    final rawJadwal = json['jadwal'];
    List<JadwalModel> jadwalList = [];
    if (rawJadwal is List) {
      jadwalList = rawJadwal
          .whereType<Map<String, dynamic>>()
          .map((j) => JadwalModel.fromJson(j))
          .toList();
    }

    return RuteModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      nama: json['nama']?.toString() ?? 'Rute #${json['id']}',
      hari: json['hari']?.toString() ?? '',
      jam: json['jam']?.toString(),
      aktif: json['aktif'] != false,
      kelurahanId: kelurahan != null && kelurahan['id'] is int ? kelurahan['id'] : null,
      kelurahanNama: kelurahanNama,
      kecamatan: kecamatan,
      zonaId: zona != null && zona['id'] is int ? zona['id'] : null,
      zonaNama: zonaNama,
      petugasId: petugas != null && petugas['id'] is int ? petugas['id'] : null,
      petugasNama: petugas?['nama']?.toString(),
      kendaraanId: kendaraan != null && kendaraan['id'] is int ? kendaraan['id'] : null,
      kendaraanNama: kendaraan?['nama']?.toString(),
      kendaraanJenis: kendaraan?['jenis']?.toString(),
      platNomor: kendaraan?['platNomor']?.toString(),
      totalJadwal: count != null && count['jadwal'] is int
          ? count['jadwal']
          : (jadwalList.isNotEmpty ? jadwalList.length : 0),
      jadwal: jadwalList,
    );
  }

  List<String> get hariList =>
      hari.split(RegExp(r'[,/|;]+')).map((e) => e.trim()).where((e) => e.isNotEmpty).toList();

  static int _dayIndex(String day) {
    final d = day.toLowerCase().trim();
    if (d.startsWith('sen')) return 1;
    if (d.startsWith('sel')) return 2;
    if (d.startsWith('rab')) return 3;
    if (d.startsWith('kam')) return 4;
    if (d.startsWith('jum')) return 5;
    if (d.startsWith('sab')) return 6;
    if (d.startsWith('min')) return 7;
    return -1;
  }

  bool isOperasionalHari(String hariCari) {
    final lower = hariCari.toLowerCase().trim();
    if (lower == 'semua') return true;
    final ruteHariLower = hari.toLowerCase().trim();
    if (ruteHariLower.isEmpty) return true;
    if (ruteHariLower.contains('setiap hari') ||
        ruteHariLower.contains('tiap hari') ||
        ruteHariLower.contains('harian') ||
        ruteHariLower.contains('semua')) {
      return true;
    }

    final parts = ruteHariLower
        .split(RegExp(r'[,/|;]+'))
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty);

    for (final part in parts) {
      if (part == lower || part.contains(lower)) return true;
      if (part.contains('-')) {
        final range = part.split('-').map((e) => e.trim()).toList();
        if (range.length == 2) {
          final startIdx = _dayIndex(range[0]);
          final endIdx = _dayIndex(range[1]);
          final targetIdx = _dayIndex(lower);
          if (startIdx != -1 && endIdx != -1 && targetIdx != -1) {
            if (startIdx <= endIdx) {
              if (targetIdx >= startIdx && targetIdx <= endIdx) return true;
            } else {
              if (targetIdx >= startIdx || targetIdx <= endIdx) return true;
            }
          }
        }
      }
    }
    return false;
  }
}
