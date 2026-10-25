class CalonPelangganModel {
  final int id;
  final String nama;
  final String? noTelepon;
  final String alamat;
  final String? rtRw;
  final String? kelurahan;
  final String? kategori;
  final String status; // calon, aktif, nonaktif
  final double? latitude;
  final double? longitude;
  final String? fotoRumah;
  final String? patokanLokasi;
  final String? createdAt;

  CalonPelangganModel({
    required this.id,
    required this.nama,
    this.noTelepon,
    required this.alamat,
    this.rtRw,
    this.kelurahan,
    this.kategori,
    required this.status,
    this.latitude,
    this.longitude,
    this.fotoRumah,
    this.patokanLokasi,
    this.createdAt,
  });

  factory CalonPelangganModel.fromJson(Map<String, dynamic> json) {
    return CalonPelangganModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      nama: json['nama']?.toString() ?? '',
      noTelepon: json['noTelepon']?.toString(),
      alamat: json['alamat']?.toString() ?? '',
      rtRw: json['rtRw']?.toString(),
      kelurahan: json['kelurahan'] is Map
          ? json['kelurahan']['nama']?.toString()
          : (json['kelurahan']?.toString() ?? json['wilayah']?['nama']?.toString()),
      kategori: json['kategori']?.toString(),
      status: json['status']?.toString() ?? 'calon',
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      fotoRumah: json['fotoRumah']?.toString(),
      patokanLokasi: json['patokanLokasi']?.toString(),
      createdAt: json['createdAt']?.toString(),
    );
  }
}
