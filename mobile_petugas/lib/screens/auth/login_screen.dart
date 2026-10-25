import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _urlController = TextEditingController(text: ApiEndpoints.baseUrl);
  bool _obscurePassword = true;
  bool _showServerConfig = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Harap isi email dan password"),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    final authProvider = context.read<AuthProvider>();
    final success = await authProvider.login(email, password);

    if (!mounted) return;

    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? "Gagal login"),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header Logo Brand
                Center(
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: AppColors.primarySurface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.2), width: 1.5),
                    ),
                    child: const Icon(
                      Icons.local_shipping_rounded,
                      size: 40,
                      color: AppColors.primaryDark,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                const Text(
                  "UPS HERU LAPANGAN",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.5,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  "Portal Operasional Kru Sampah & Survei Kota Depok",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 36),

                // Input Email
                CustomTextField(
                  controller: _emailController,
                  label: "Email Petugas",
                  hint: "contoh: raka@hero.com",
                  prefixIcon: Icons.email_outlined,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),

                // Input Password
                CustomTextField(
                  controller: _passwordController,
                  label: "Kata Sandi",
                  hint: "Masukkan kata sandi",
                  prefixIcon: Icons.lock_outline,
                  obscureText: _obscurePassword,
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                      size: 20,
                      color: AppColors.textMuted,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                const SizedBox(height: 24),

                // Tombol Login
                CustomButton(
                  text: "Masuk Operasional",
                  onPressed: _handleLogin,
                  isLoading: auth.isLoading,
                ),
                const SizedBox(height: 20),

                // Pengaturan URL Server (Opsional untuk testing lokal / staging)
                TextButton.icon(
                  onPressed: () => setState(() => _showServerConfig = !_showServerConfig),
                  icon: Icon(
                    _showServerConfig ? Icons.expand_less : Icons.settings_outlined,
                    size: 16,
                    color: AppColors.textMuted,
                  ),
                  label: Text(
                    _showServerConfig ? "Tutup Pengaturan Server" : "Atur Server URL",
                    style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                  ),
                ),

                if (_showServerConfig) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        CustomTextField(
                          controller: _urlController,
                          label: "Alamat Server Backend",
                          hint: "https://upsheru.com",
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () {
                                  _urlController.text = "https://upsheru.com";
                                  auth.updateServerUrl("https://upsheru.com");
                                },
                                child: const Text("Production", style: TextStyle(fontSize: 11)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: () {
                                  final newUrl = _urlController.text.trim();
                                  if (newUrl.isNotEmpty) {
                                    auth.updateServerUrl(newUrl);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text("Server disetel ke: $newUrl")),
                                    );
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.textPrimary,
                                  foregroundColor: Colors.white,
                                ),
                                child: const Text("Simpan", style: TextStyle(fontSize: 11)),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
