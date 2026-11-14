class KomplainPelanggan {
  final int id;
  final String nama;
  final String alamat;
  final String? noTelepon;
  final String kodePelanggan;
  final double? latitude;
  final double? longitude;
  final String? patokanLokasi;
  final String? rtRw;
  final String? kelurahanNama;
  final String? zonaNama;

  KomplainPelanggan({
    required this.id,
    required this.nama,
    required this.alamat,
    this.noTelepon,
    required this.kodePelanggan,
    this.latitude,
    this.longitude,
    this.patokanLokasi,
    this.rtRw,
    this.kelurahanNama,
    this.zonaNama,
  });

  factory KomplainPelanggan.fromJson(Map<String, dynamic> json) {
    final kel = json['kelurahan'] is Map ? json['kelurahan'] : null;
    final wil = json['wilayah'] is Map ? json['wilayah'] : null;
    final zona = wil != null && wil['zona'] is Map ? wil['zona'] : null;

    return KomplainPelanggan(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      nama: json['nama']?.toString() ?? '',
      alamat: json['alamat']?.toString() ?? '',
      noTelepon: json['noTelepon']?.toString(),
      kodePelanggan: json['kodePelanggan']?.toString() ?? '',
      latitude: json['latitude'] != null ? double.tryParse(json['latitude'].toString()) : null,
      longitude: json['longitude'] != null ? double.tryParse(json['longitude'].toString()) : null,
      patokanLokasi: json['patokanLokasi']?.toString(),
      rtRw: json['rtRw']?.toString(),
      kelurahanNama: kel?['nama']?.toString(),
      zonaNama: zona?['nama']?.toString() ?? wil?['nama']?.toString(),
    );
  }

  bool get hasCoordinates =>
      latitude != null && longitude != null && latitude != 0 && longitude != 0;
}

class KomplainModel {
  final int id;
  final String jenis;
  final String deskripsi;
  final String? foto;
  final String status; // baru, proses, selesai, ditolak
  final String? tanggapan;
  final String createdAt;
  final KomplainPelanggan pelanggan;

  KomplainModel({
    required this.id,
    required this.jenis,
    required this.deskripsi,
    this.foto,
    required this.status,
    this.tanggapan,
    required this.createdAt,
    required this.pelanggan,
  });

  factory KomplainModel.fromJson(Map<String, dynamic> json) {
    return KomplainModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      jenis: json['jenis']?.toString() ?? 'tidak_diangkut',
      deskripsi: json['deskripsi']?.toString() ?? '',
      foto: json['foto']?.toString(),
      status: json['status']?.toString() ?? 'baru',
      tanggapan: json['tanggapan']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
      pelanggan: KomplainPelanggan.fromJson(
        json['pelanggan'] is Map ? Map<String, dynamic>.from(json['pelanggan']) : {},
      ),
    );
  }

  String get labelJenis {
    switch (jenis) {
      case 'tidak_diangkut':
        return 'Sampah Tidak Diangkut';
      case 'sampah_menumpuk':
        return 'Sampah Menumpuk Ekstrem';
      case 'jadwal_terlewat':
        return 'Jadwal Terlewat';
      case 'lainnya':
      default:
        return 'Keluhan Lapangan Lainnya';
    }
  }

  bool get isBaru => status == 'baru';
  bool get isProses => status == 'proses' || status == 'diproses';
  bool get isSelesai => status == 'selesai';
}
