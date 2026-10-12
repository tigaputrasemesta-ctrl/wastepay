import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color text;
    String label;

    switch (status.toLowerCase()) {
      case 'diambil':
      case 'lunas':
      case 'aktif':
        bg = AppColors.successBg;
        text = AppColors.success;
        label = status == 'diambil' ? 'Diambil' : (status == 'aktif' ? 'Aktif' : 'Lunas');
        break;
      case 'terjadwal':
      case 'calon':
        bg = AppColors.infoBg;
        text = AppColors.info;
        label = status == 'terjadwal' ? 'Terjadwal' : 'Calon Warga';
        break;
      case 'kosong':
        bg = AppColors.warningBg;
        text = AppColors.warning;
        label = 'Rumah Kosong';
        break;
      case 'tidak_diangkut':
        bg = AppColors.dangerBg;
        text = AppColors.danger;
        label = 'Tidak Diangkut';
        break;
      default:
        bg = AppColors.surfaceMuted;
        text = AppColors.textSecondary;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: text.withValues(alpha: 0.2)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: text,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
