class AppUpdateModel {
  final String versionName;
  final int versionCode;
  final int minVersionCode;
  final String apkUrl;
  final List<String> changelog;

  AppUpdateModel({
    required this.versionName,
    required this.versionCode,
    required this.minVersionCode,
    required this.apkUrl,
    required this.changelog,
  });

  factory AppUpdateModel.fromJson(Map<String, dynamic> json, String baseUrl) {
    var rawUrl = json['apkUrl']?.toString() ?? '/apk/UPS-HERU-Petugas-Native.apk';
    // Jika rawUrl relatif (/apk/...), ubah jadi URL penuh menggunakan baseUrl
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      final cleanBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
      final cleanPath = rawUrl.startsWith('/') ? rawUrl : '/$rawUrl';
      rawUrl = '$cleanBase$cleanPath';
    }

    final rawList = json['changelog'];
    List<String> list = [];
    if (rawList is List) {
      list = rawList.map((e) => e.toString()).toList();
    }

    return AppUpdateModel(
      versionName: json['versionName']?.toString() ?? '1.0.0',
      versionCode: json['versionCode'] is int
          ? json['versionCode']
          : int.tryParse(json['versionCode']?.toString() ?? '1') ?? 1,
      minVersionCode: json['minVersionCode'] is int
          ? json['minVersionCode']
          : int.tryParse(json['minVersionCode']?.toString() ?? '1') ?? 1,
      apkUrl: rawUrl,
      changelog: list,
    );
  }

  bool isUpdateAvailable(int currentVersionCode) => versionCode > currentVersionCode;
  bool isForceUpdate(int currentVersionCode) => currentVersionCode < minVersionCode;
}
