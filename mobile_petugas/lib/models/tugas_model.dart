class PelangganTugas {
  final int id;
  final String nama;
  final String alamat;
  final String kodePelanggan;
  final double? latitude;
  final double? longitude;
  final String? patokanLokasi;
  final String? noTelepon;
  final String? fotoRumah;
  final String? rtRw;
  final int? zonaId;
  final String? zonaNama;
  final String? zonaWarna;
  final String? wilayahNama;

  PelangganTugas({
    required this.id,
    required this.nama,
    required this.alamat,
    required this.kodePelanggan,
    this.latitude,
    this.longitude,
    this.patokanLokasi,
    this.noTelepon,
    this.fotoRumah,
    this.rtRw,
    this.zonaId,
    this.zonaNama,
    this.zonaWarna,
    this.wilayahNama,
  });

  factory PelangganTugas.fromJson(Map<String, dynamic> json) {
    // Parsing zona jika tersedia dari relasi zona atau wilayah.zona
    final wilayah = json['wilayah'] is Map<String, dynamic> ? json['wilayah'] : null;
    final zona = json['zona'] is Map<String, dynamic>
        ? json['zona']
        : (wilayah != null && wilayah['zona'] is Map<String, dynamic> ? wilayah['zona'] : null);

    final zonaNamaParsed = json['zonaNama']?.toString() ?? zona?['nama']?.toString();
    final zonaWarnaParsed = json['zonaWarna']?.toString() ?? zona?['warna']?.toString();
    final zonaIdParsed = json['zonaId'] is int
        ? json['zonaId']
        : int.tryParse(json['zonaId']?.toString() ?? zona?['id']?.toString() ?? '');

    return PelangganTugas(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      nama: json['nama']?.toString() ?? '',
      alamat: json['alamat']?.toString() ?? '',
      kodePelanggan: json['kodePelanggan']?.toString() ?? '',
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      patokanLokasi: json['patokanLokasi']?.toString(),
      noTelepon: json['noTelepon']?.toString(),
      fotoRumah: json['fotoRumah']?.toString(),
      rtRw: json['rtRw']?.toString(),
      zonaId: zonaIdParsed,
      zonaNama: zonaNamaParsed,
      zonaWarna: zonaWarnaParsed,
      wilayahNama: json['wilayahNama']?.toString() ?? wilayah?['nama']?.toString(),
    );
  }

  bool get hasCoordinates =>
      latitude != null && longitude != null && latitude != 0 && longitude != 0;
}

class TunggakanInfo {
  final bool isMenunggak;
  final int jumlahBulan;
  final double totalNominal;
  final bool bolehPickup;

  TunggakanInfo({
    required this.isMenunggak,
    required this.jumlahBulan,
    required this.totalNominal,
    required this.bolehPickup,
  });

  factory TunggakanInfo.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return TunggakanInfo(
        isMenunggak: false,
        jumlahBulan: 0,
        totalNominal: 0,
        bolehPickup: true,
      );
    }
    return TunggakanInfo(
      isMenunggak: json['isMenunggak'] == true,
      jumlahBulan: json['jumlahBulan'] is int ? json['jumlahBulan'] : int.tryParse(json['jumlahBulan'].toString()) ?? 0,
      totalNominal: json['totalNominal'] != null ? double.tryParse(json['totalNominal'].toString()) ?? 0 : 0,
      bolehPickup: json['bolehPickup'] != false,
    );
  }
}

class TugasModel {
  final int id;
  final String tanggal;
  final String status; // terjadwal, diambil, tidak_diangkut, kosong
  final double? volume;
  final double? berat;
  final String? jenisSampah;
  final String? catatan;
  final int? urutan;
  final PelangganTugas pelanggan;
  final TunggakanInfo tunggakan;

  TugasModel({
    required this.id,
    required this.tanggal,
    required this.status,
    this.volume,
    this.berat,
    this.jenisSampah,
    this.catatan,
    this.urutan,
    required this.pelanggan,
    required this.tunggakan,
  });

  factory TugasModel.fromJson(Map<String, dynamic> json) {
    final rawPelanggan = json['pelanggan'] is Map
        ? Map<String, dynamic>.from(json['pelanggan'])
        : <String, dynamic>{};
    if (json['zona'] != null && rawPelanggan['zona'] == null) {
      rawPelanggan['zona'] = json['zona'];
    }

    return TugasModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      tanggal: json['tanggal']?.toString() ?? '',
      status: json['status']?.toString() ?? 'terjadwal',
      volume: json['volume'] != null ? double.tryParse(json['volume'].toString()) : null,
      berat: json['berat'] != null ? double.tryParse(json['berat'].toString()) : null,
      jenisSampah: json['jenisSampah']?.toString(),
      catatan: json['catatan']?.toString(),
      urutan: json['urutan'] != null ? int.tryParse(json['urutan'].toString()) : null,
      pelanggan: PelangganTugas.fromJson(rawPelanggan),
      tunggakan: TunggakanInfo.fromJson(json['tunggakan'] is Map ? json['tunggakan'] : null),
    );
  }

  bool get isSelesai => status == 'diambil';
  bool get isTerjadwal => status == 'terjadwal';
  bool get isDilewati => status == 'tidak_diangkut' || status == 'kosong';
}
