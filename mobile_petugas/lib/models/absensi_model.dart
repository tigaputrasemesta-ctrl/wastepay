class AbsensiModel {
  final int id;
  final String? waktuMasuk;
  final String? waktuSelesai;
  final String status;
  final String? fotoMasuk;
  final String? fotoSelesai;
  final double? latMasuk;
  final double? lngMasuk;

  AbsensiModel({
    required this.id,
    this.waktuMasuk,
    this.waktuSelesai,
    required this.status,
    this.fotoMasuk,
    this.fotoSelesai,
    this.latMasuk,
    this.lngMasuk,
  });

  factory AbsensiModel.fromJson(Map<String, dynamic> json) {
    return AbsensiModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      waktuMasuk: json['waktuMasuk']?.toString(),
      waktuSelesai: json['waktuSelesai']?.toString(),
      status: json['status']?.toString() ?? 'hadir',
      fotoMasuk: json['fotoMasuk']?.toString(),
      fotoSelesai: json['fotoSelesai']?.toString(),
      latMasuk: json['latMasuk'] != null ? double.tryParse(json['latMasuk'].toString()) : null,
      lngMasuk: json['lngMasuk'] != null ? double.tryParse(json['lngMasuk'].toString()) : null,
    );
  }

  bool get sudahMasuk => waktuMasuk != null && waktuMasuk!.isNotEmpty;
  bool get sudahSelesai => waktuSelesai != null && waktuSelesai!.isNotEmpty;
}
