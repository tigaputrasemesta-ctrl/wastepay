class PelangganModel {
  final int id;
  final String nama;
  final String noTelepon;
  final String kodePelanggan;
  final String alamat;
  final String? rtRw;
  final String? patokanLokasi;
  final String? fotoRumah;
  final String status;
  final String kategori;
  final double? latitude;
  final double? longitude;
  final double? customTarif;
  final int? wilayahId;
  final String? wilayahNama;
  final int? zonaId;
  final String? zonaNama;
  final String? zonaWarna;
  final String? kelurahanNama;
  final String? paketNama;
  final double? paketHarga;
  final String? updatedAt;

  PelangganModel({
    required this.id,
    required this.nama,
    required this.noTelepon,
    required this.kodePelanggan,
    required this.alamat,
    this.rtRw,
    this.patokanLokasi,
    this.fotoRumah,
    required this.status,
    required this.kategori,
    this.latitude,
    this.longitude,
    this.customTarif,
    this.wilayahId,
    this.wilayahNama,
    this.zonaId,
    this.zonaNama,
    this.zonaWarna,
    this.kelurahanNama,
    this.paketNama,
    this.paketHarga,
    this.updatedAt,
  });

  factory PelangganModel.fromJson(Map<String, dynamic> json) {
    final wilayah = json['wilayah'] is Map<String, dynamic> ? json['wilayah'] : null;
    final zona = wilayah != null && wilayah['zona'] is Map<String, dynamic>
        ? wilayah['zona']
        : null;
    final kelurahan = json['kelurahan'] is Map<String, dynamic> ? json['kelurahan'] : null;
    final paket = json['paket'] is Map<String, dynamic> ? json['paket'] : null;

    return PelangganModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      nama: json['nama']?.toString() ?? '',
      noTelepon: json['noTelepon']?.toString() ?? '',
      kodePelanggan: json['kodePelanggan']?.toString() ?? '',
      alamat: json['alamat']?.toString() ?? '',
      rtRw: json['rtRw']?.toString(),
      patokanLokasi: json['patokanLokasi']?.toString(),
      fotoRumah: json['fotoRumah']?.toString(),
      status: json['status']?.toString() ?? 'aktif',
      kategori: json['kategori']?.toString() ?? 'level_1',
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      customTarif: json['customTarif'] != null ? double.tryParse(json['customTarif'].toString()) : null,
      wilayahId: json['wilayahId'] is int ? json['wilayahId'] : int.tryParse(json['wilayahId']?.toString() ?? ''),
      wilayahNama: wilayah?['nama']?.toString(),
      zonaId: zona?['id'] is int ? zona['id'] : int.tryParse(zona?['id']?.toString() ?? ''),
      zonaNama: zona?['nama']?.toString(),
      zonaWarna: zona?['warna']?.toString(),
      kelurahanNama: kelurahan?['nama']?.toString(),
      paketNama: paket?['nama']?.toString(),
      paketHarga: paket?['harga'] != null ? double.tryParse(paket['harga'].toString()) : null,
      updatedAt: json['updatedAt']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nama': nama,
      'noTelepon': noTelepon,
      'kodePelanggan': kodePelanggan,
      'alamat': alamat,
      'rtRw': rtRw,
      'patokanLokasi': patokanLokasi,
      'fotoRumah': fotoRumah,
      'status': status,
      'kategori': kategori,
      'latitude': latitude,
      'longitude': longitude,
      'customTarif': customTarif,
      'wilayahId': wilayahId,
      'wilayah': {
        'nama': wilayahNama,
        'zona': {
          'id': zonaId,
          'nama': zonaNama,
          'warna': zonaWarna,
        },
      },
      'kelurahan': {'nama': kelurahanNama},
      'paket': {'nama': paketNama, 'harga': paketHarga},
      'updatedAt': updatedAt,
    };
  }

  bool get hasCoordinates =>
      latitude != null && longitude != null && latitude != 0 && longitude != 0;
}
