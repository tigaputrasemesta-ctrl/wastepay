class UserModel {
  final int id;
  final String email;
  final String nama;
  final String role;
  final String? noTelepon;
  final String? foto;

  UserModel({
    required this.id,
    required this.email,
    required this.nama,
    required this.role,
    this.noTelepon,
    this.foto,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      email: json['email']?.toString() ?? '',
      nama: json['nama']?.toString() ?? '',
      role: json['role']?.toString() ?? 'petugas',
      noTelepon: json['noTelepon']?.toString(),
      foto: json['foto']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'nama': nama,
      'role': role,
      'noTelepon': noTelepon,
      'foto': foto,
    };
  }
}
