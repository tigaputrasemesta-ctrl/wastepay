import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_version.dart';
import '../models/app_update_model.dart';
import '../services/update_service.dart';
import '../widgets/update_dialog.dart';

class UpdateProvider extends ChangeNotifier {
  AppUpdateModel? _updateInfo;
  bool _isChecking = false;
  bool _hasUpdate = false;
  String? _errorMessage;

  AppUpdateModel? get updateInfo => _updateInfo;
  bool get isChecking => _isChecking;
  bool get hasUpdate => _hasUpdate;
  String? get errorMessage => _errorMessage;

  /// Cek versi aplikasi dari server
  Future<void> checkForUpdate({
    BuildContext? context,
    bool showToastIfLatest = false,
  }) async {
    _isChecking = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final info = await UpdateService.checkUpdate();
      _updateInfo = info;

      if (info != null && info.isUpdateAvailable(AppVersion.versionCode)) {
        _hasUpdate = true;
        _isChecking = false;
        notifyListeners();

        // Tampilkan dialog otomatis jika context tersedia
        if (context != null && context.mounted) {
          UpdateDialog.show(context, info);
        }
      } else {
        _hasUpdate = false;
        _isChecking = false;
        notifyListeners();

        if (showToastIfLatest && context != null && context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Aplikasi Anda sudah versi terbaru (${AppVersion.versionName})"),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      _isChecking = false;
      _errorMessage = "Gagal memeriksa pembaruan: $e";
      notifyListeners();

      if (showToastIfLatest && context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Gagal memeriksa pembaruan. Periksa koneksi internet."),
            backgroundColor: AppColors.danger,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}
