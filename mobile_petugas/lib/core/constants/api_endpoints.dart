class ApiEndpoints {
  // URL default produksi. Bisa diubah dari layar login (misal untuk testing dev).
  static String baseUrl = "https://o2whero.com";

  static void setBaseUrl(String url) {
    // Pastikan tidak ada trailing slash
    baseUrl = url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  // Auth & Petugas
  static String get login => "$baseUrl/api/auth/login";
  static String get profile => "$baseUrl/api/petugas/me";

  // Absensi GPS & Foto Selfie
  static String get absensi => "$baseUrl/api/absensi";

  // Tugas Pengangkutan Sampah Harian
  static String get pengangkutan => "$baseUrl/api/pengangkutan";
  static String pengangkutanDetail(int id) => "$baseUrl/api/pengangkutan/$id";
  static String get kendaraan => "$baseUrl/api/kendaraan";

  // Survei Lokasi Calon Pelanggan Baru (Geotag)
  static String get survei => "$baseUrl/api/survei";
  static String surveiDetail(int id) => "$baseUrl/api/survei/$id";

  // Pelacakan GPS Armada Live (Background/Foreground)
  static String get tracking => "$baseUrl/api/mobile/tracking";

  // Jadwal & Rute Operasional Pengangkutan
  static String get rute => "$baseUrl/api/rute";
  static String ruteDetail(int id) => "$baseUrl/api/rute/$id";
  static String get jadwal => "$baseUrl/api/jadwal";
  static String jadwalByRute(int ruteId) => "$baseUrl/api/jadwal?ruteId=$ruteId";
  static String jadwalByHari(String hari) => "$baseUrl/api/jadwal?hari=$hari";

  // Versi & Pembaruan Aplikasi (In-App Auto Update)
  static String get version => "$baseUrl/api/mobile/version";

  // Komplain / Lapor Kendala Darurat
  static String get komplain => "$baseUrl/api/komplain";
  static String get klaim => "$baseUrl/api/klaim";
}
