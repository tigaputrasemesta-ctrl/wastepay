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
  final _emailController = TextEditingController(text: "raka@hero.com");
  final _passwordController = TextEditingController(text: "123456");
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

  Future<void> _quickLogin(String email, String password) async {
    _emailController.text = email;
    _passwordController.text = password;
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

  Widget _buildQuickDriverCard({
    required String title,
    required String subtitle,
    required String email,
    required Color color,
    required AuthProvider auth,
  }) {
    return InkWell(
      onTap: auth.isLoading ? null : () => _quickLogin(email, "123456"),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.35)),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.06),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(Icons.local_shipping_rounded, color: color, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 10, color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                "Masuk ➔",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
      ),
    );
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
                const SizedBox(height: 24),

                // ⚡ MODE TERBUKA: Akses Cepat Supir Tanpa Perlu Mengetik Kata Sandi
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF00AA13),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 14),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            "MODE TERBUKA (AKSES CEPAT)",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              color: Color(0xFF14532D),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        "Pilih supir armada Anda untuk masuk instan ke Cockpit:",
                        style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                      ),
                      const SizedBox(height: 10),
                      _buildQuickDriverCard(
                        title: "Raka Driver (Astroboy)",
                        subtitle: "Grandmax Astroboy • B 2021 HRR",
                        email: "raka@hero.com",
                        color: const Color(0xFF00AA13),
                        auth: auth,
                      ),
                      const SizedBox(height: 6),
                      _buildQuickDriverCard(
                        title: "Ago Driver (Grandmax)",
                        subtitle: "Grandmax • B 1999 HRR",
                        email: "ago@hero.com",
                        color: const Color(0xFF0284C7),
                        auth: auth,
                      ),
                      const SizedBox(height: 6),
                      _buildQuickDriverCard(
                        title: "Piat Driver (Carry)",
                        subtitle: "Carry Futura • B 2000 HRR",
                        email: "piat@hero.com",
                        color: const Color(0xFFD97706),
                        auth: auth,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Pemisah Atau Masuk Manual
                const Row(
                  children: [
                    Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 10),
                      child: Text(
                        "atau masuk akun manual",
                        style: TextStyle(fontSize: 10, color: AppColors.textMuted, fontWeight: FontWeight.w600),
                      ),
                    ),
                    Expanded(child: Divider(color: Color(0xFFE2E8F0))),
                  ],
                ),
                const SizedBox(height: 16),

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
