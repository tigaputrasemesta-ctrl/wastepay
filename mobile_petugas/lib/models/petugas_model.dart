class PetugasModel {
  final int id;
  final String nama;
  final String? noTelepon;
  final String? email;
  final String? foto;
  final String? jabatan; // Petugas Angkut, Petugas Tagih, Petugas Survei
  final String? kelurahan;
  final bool aktif;

  PetugasModel({
    required this.id,
    required this.nama,
    this.noTelepon,
    this.email,
    this.foto,
    this.jabatan,
    this.kelurahan,
    required this.aktif,
  });

  factory PetugasModel.fromJson(Map<String, dynamic> json) {
    return PetugasModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      nama: json['nama']?.toString() ?? '',
      noTelepon: json['noTelepon']?.toString(),
      email: json['email']?.toString(),
      foto: json['foto']?.toString(),
      jabatan: json['jabatan']?.toString(),
      kelurahan: json['kelurahan']?.toString(),
      aktif: json['aktif'] == true,
    );
  }
}
