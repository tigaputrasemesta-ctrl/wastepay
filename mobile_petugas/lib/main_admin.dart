import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'providers/auth_provider.dart';
import 'providers/admin_provider.dart';
import 'providers/update_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/admin/admin_dashboard_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WastePayAdminNativeApp());
}

class WastePayAdminNativeApp extends StatelessWidget {
  const WastePayAdminNativeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initSession()),
        ChangeNotifierProvider(create: (_) => AdminProvider()),
        ChangeNotifierProvider(create: (_) => UpdateProvider()),
      ],
      child: MaterialApp(
        title: 'UPS HERU Admin',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0B1120),
          primaryColor: const Color(0xFF0284C7),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF0284C7),
            secondary: Color(0xFF00AA13),
            surface: Color(0xFF0F172A),
          ),
          useMaterial3: true,
        ),
        home: const AdminAuthGate(),
      ),
    );
  }
}

class AdminAuthGate extends StatelessWidget {
  const AdminAuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    switch (auth.status) {
      case AuthStatus.initial:
        return const Scaffold(
          backgroundColor: Color(0xFF0B1120),
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF38BDF8)),
                  ),
                ),
                SizedBox(height: 16),
                Text(
                  "Memuat data admin di HP...",
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
        );
      case AuthStatus.authenticated:
        return const AdminDashboardScreen();
      case AuthStatus.unauthenticated:
        return const LoginScreen();
    }
  }
}
