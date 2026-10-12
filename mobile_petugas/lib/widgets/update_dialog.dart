import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/constants/app_colors.dart';
import '../core/constants/app_version.dart';
import '../models/app_update_model.dart';

class UpdateDialog extends StatelessWidget {
  final AppUpdateModel updateInfo;

  const UpdateDialog({super.key, required this.updateInfo});

  static Future<void> show(BuildContext context, AppUpdateModel updateInfo) {
    return showDialog(
      context: context,
      barrierDismissible: !updateInfo.isForceUpdate(AppVersion.versionCode),
      builder: (ctx) => UpdateDialog(updateInfo: updateInfo),
    );
  }

  Future<void> _handleDownload(BuildContext context) async {
    final uri = Uri.parse(updateInfo.apkUrl);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Gagal membuka browser untuk mengunduh pembaruan."),
              backgroundColor: AppColors.danger,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Terjadi kesalahan: $e"),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isForce = updateInfo.isForceUpdate(AppVersion.versionCode);

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      contentPadding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primarySurface,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.system_update_rounded,
              color: AppColors.primaryDark,
              size: 26,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  "Pembaruan Tersedia!",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  "Versi ${updateInfo.versionName} (Saat ini: ${AppVersion.versionName})",
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              "Apa yang baru di versi ini:",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 8),
            if (updateInfo.changelog.isNotEmpty)
              ...updateInfo.changelog.map((c) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("• ", style: TextStyle(color: AppColors.primaryDark, fontWeight: FontWeight.bold)),
                        Expanded(
                          child: Text(
                            c,
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ))
            else
              const Text(
                "Pembaruan fitur, perbaikan bug, dan stabilitas sistem.",
                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.surfaceMuted,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline_rounded, size: 16, color: AppColors.textMuted),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Ketuk tombol di bawah untuk mengunduh dan memperbarui secara otomatis.",
                      style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        if (!isForce)
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Nanti Saja"),
          ),
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryDark,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          ),
          icon: const Icon(Icons.download_rounded, size: 18),
          label: const Text(
            "Perbarui Sekarang",
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
          onPressed: () {
            _handleDownload(context);
            if (!isForce) {
              Navigator.pop(context);
            }
          },
        ),
      ],
    );
  }
}
