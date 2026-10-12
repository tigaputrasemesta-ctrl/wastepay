import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/constants/app_colors.dart';
import 'providers/auth_provider.dart';
import 'providers/absensi_provider.dart';
import 'providers/pengangkutan_provider.dart';
import 'providers/survei_provider.dart';
import 'providers/tracking_provider.dart';
import 'providers/rute_provider.dart';
import 'providers/update_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WastePayPetugasApp());
}

class WastePayPetugasApp extends StatelessWidget {
  const WastePayPetugasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initSession()),
        ChangeNotifierProvider(create: (_) => AbsensiProvider()),
        ChangeNotifierProvider(create: (_) => PengangkutanProvider()),
        ChangeNotifierProvider(create: (_) => SurveiProvider()),
        ChangeNotifierProvider(create: (_) => TrackingProvider()),
        ChangeNotifierProvider(create: (_) => RuteProvider()),
        ChangeNotifierProvider(create: (_) => UpdateProvider()),
      ],
      child: MaterialApp(
        title: 'UPS HERU Lapangan',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    switch (auth.status) {
      case AuthStatus.initial:
        return const Scaffold(
          backgroundColor: Colors.white,
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                SizedBox(height: 16),
                Text(
                  "Memuat sesi petugas...",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        );
      case AuthStatus.authenticated:
        return const DashboardScreen();
      case AuthStatus.unauthenticated:
        return const LoginScreen();
    }
  }
}
