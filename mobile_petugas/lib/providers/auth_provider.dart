import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../core/constants/api_endpoints.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';
import '../models/petugas_model.dart';
import '../services/auth_service.dart';

enum AuthStatus { initial, authenticated, unauthenticated }

class AuthProvider with ChangeNotifier {
  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  PetugasModel? _petugas;
  bool _isLoading = false;
  String? _errorMessage;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  PetugasModel? get petugas => _petugas;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Inisialisasi sesi dari penyimpanan lokal saat aplikasi dibuka
  Future<void> initSession() async {
    final savedBaseUrl = await TokenStorage.getSavedBaseUrl();
    if (savedBaseUrl != null && savedBaseUrl.isNotEmpty) {
      if (savedBaseUrl.contains("o2whero.com") || savedBaseUrl.contains("o2w.vercel.app")) {
        ApiEndpoints.setBaseUrl("https://upsheru.com");
        await TokenStorage.saveBaseUrl("https://upsheru.com");
      } else {
        ApiEndpoints.setBaseUrl(savedBaseUrl);
      }
    }

    final token = await TokenStorage.getToken();
    if (token == null || token.isEmpty) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    // Coba baca cache user
    final cachedUserJson = await TokenStorage.getUserJson();
    if (cachedUserJson != null) {
      try {
        _user = UserModel.fromJson(jsonDecode(cachedUserJson));
      } catch (_) {}
    }

    try {
      _petugas = await AuthService.getProfile();
      _status = AuthStatus.authenticated;
    } catch (e) {
      // Jika token expired (401)
      if (e.toString().contains('401') || e.toString().contains('Sesi login berakhir')) {
        await TokenStorage.clear();
        _status = AuthStatus.unauthenticated;
      } else {
        // Offline / gangguan jaringan: tetap izinkan masuk jika ada cache
        if (_user != null) {
          _status = AuthStatus.authenticated;
        } else {
          _status = AuthStatus.unauthenticated;
        }
      }
    }
    notifyListeners();
  }

  /// Proses login
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _user = await AuthService.login(email, password);
      try {
        _petugas = await AuthService.getProfile();
      } catch (_) {}
      _status = AuthStatus.authenticated;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    await AuthService.logout();
    _user = null;
    _petugas = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  void updateServerUrl(String url) {
    ApiEndpoints.setBaseUrl(url);
    TokenStorage.saveBaseUrl(url);
    notifyListeners();
  }
}
