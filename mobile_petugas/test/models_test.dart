import 'package:flutter_test/flutter_test.dart';
import 'package:o2w_petugas_lapangan/models/user_model.dart';
import 'package:o2w_petugas_lapangan/models/petugas_model.dart';
import 'package:o2w_petugas_lapangan/models/absensi_model.dart';
import 'package:o2w_petugas_lapangan/models/tugas_model.dart';
import 'package:o2w_petugas_lapangan/models/calon_pelanggan_model.dart';
import 'package:o2w_petugas_lapangan/models/rute_model.dart';
import 'package:o2w_petugas_lapangan/models/app_update_model.dart';

void main() {
  group('Model Serialization Tests', () {
    test('UserModel parse json with all fields', () {
      final json = {
        'id': 10,
        'email': 'petugas@o2whero.com',
        'nama': 'Budi Santoso',
        'role': 'petugas',
        'noTelepon': '08123456789',
        'foto': 'https://example.com/foto.jpg',
      };
      final user = UserModel.fromJson(json);
      expect(user.id, 10);
      expect(user.email, 'petugas@o2whero.com');
      expect(user.nama, 'Budi Santoso');
      expect(user.role, 'petugas');
      expect(user.noTelepon, '08123456789');

      final serialized = user.toJson();
      expect(serialized['id'], 10);
      expect(serialized['email'], 'petugas@o2whero.com');
    });

    test('PetugasModel parse json correctly', () {
      final json = {
        'id': 5,
        'nama': 'Agus Lapangan',
        'jabatan': 'Petugas Angkut',
        'kelurahan': 'Kalibaru',
        'aktif': true,
      };
      final petugas = PetugasModel.fromJson(json);
      expect(petugas.id, 5);
      expect(petugas.nama, 'Agus Lapangan');
      expect(petugas.jabatan, 'Petugas Angkut');
      expect(petugas.kelurahan, 'Kalibaru');
      expect(petugas.aktif, true);
    });

    test('AbsensiModel detects status properly', () {
      final json = {
        'id': 101,
        'waktuMasuk': '2026-10-12T07:30:00Z',
        'waktuSelesai': null,
        'status': 'hadir',
        'latMasuk': -6.424838,
        'lngMasuk': 106.832667,
      };
      final absensi = AbsensiModel.fromJson(json);
      expect(absensi.sudahMasuk, true);
      expect(absensi.sudahSelesai, false);
      expect(absensi.latMasuk, -6.424838);
    });

    test('TugasModel handles debt and customer coordinates', () {
      final json = {
        'id': 77,
        'tanggal': '2026-10-12',
        'status': 'terjadwal',
        'pelanggan': {
          'id': 200,
          'nama': 'Ibu Ratna',
          'alamat': 'Jl. Kenanga No. 12 RT 03/05',
          'kodePelanggan': 'P000045',
          'latitude': -6.4251,
          'longitude': 106.8330,
          'patokanLokasi': 'Depan pos satpam',
        },
        'tunggakan': {
          'isMenunggak': true,
          'jumlahBulan': 2,
          'totalNominal': 70000.0,
          'bolehPickup': false,
        },
      };
      final tugas = TugasModel.fromJson(json);
      expect(tugas.isTerjadwal, true);
      expect(tugas.isSelesai, false);
      expect(tugas.pelanggan.nama, 'Ibu Ratna');
      expect(tugas.pelanggan.latitude, -6.4251);
      expect(tugas.tunggakan.isMenunggak, true);
      expect(tugas.tunggakan.jumlahBulan, 2);
    });

    test('CalonPelangganModel parse correctly', () {
      final json = {
        'id': 301,
        'nama': 'Pak Hendra',
        'noTelepon': '081299998888',
        'alamat': 'Jl. Anggrek Blok C2',
        'kelurahan': 'Cilodong',
        'status': 'calon',
      };
      final calon = CalonPelangganModel.fromJson(json);
      expect(calon.id, 301);
      expect(calon.nama, 'Pak Hendra');
      expect(calon.status, 'calon');
      expect(calon.kelurahan, 'Cilodong');
    });

    test('RuteModel and JadwalModel parse correctly with operational day checking', () {
      final json = {
        'id': 12,
        'nama': 'Rute Kalibaru RT 01',
        'hari': 'Senin, Rabu, Jumat',
        'jam': '08:00 - 12:00',
        'kelurahan': {'id': 1, 'nama': 'Kalibaru', 'kecamatan': 'Cilincing'},
        'zona': {'id': 3, 'nama': 'Zona 1'},
        'petugas': {'id': 5, 'nama': 'Budi'},
        'jadwal': [
          {
            'id': 101,
            'hari': 'Senin',
            'jam': '08:30',
            'pelanggan': {
              'id': 55,
              'nama': 'Ibu Ani',
              'alamat': 'Jl. Nelayan No. 10',
              'noTelepon': '081234567890',
              'latitude': -6.1234,
              'longitude': 106.9123,
            },
          }
        ],
        '_count': {'jadwal': 1},
      };

      final rute = RuteModel.fromJson(json);
      expect(rute.id, 12);
      expect(rute.nama, 'Rute Kalibaru RT 01');
      expect(rute.kelurahanNama, 'Kalibaru');
      expect(rute.zonaNama, 'Zona 1');
      expect(rute.totalJadwal, 1);
      expect(rute.isOperasionalHari('Senin'), true);
      expect(rute.isOperasionalHari('Rabu'), true);
      expect(rute.isOperasionalHari('Selasa'), false);

      expect(rute.jadwal.length, 1);
      final j = rute.jadwal.first;
      expect(j.id, 101);
      expect(j.pelangganNama, 'Ibu Ani');
      expect(j.hasCoordinates, true);
      expect(j.latitude, -6.1234);
    });

    test('AppUpdateModel parses update payload and detects update available', () {
      final json = {
        'versionName': '1.0.2',
        'versionCode': 3,
        'minVersionCode': 1,
        'apkUrl': '/apk/UPS-HERU-Petugas-Native.apk',
        'changelog': ['Pembaruan rute', 'Perbaikan navigasi'],
      };

      final update = AppUpdateModel.fromJson(json, 'https://o2whero.com');
      expect(update.versionName, '1.0.2');
      expect(update.versionCode, 3);
      expect(update.apkUrl, 'https://o2whero.com/apk/UPS-HERU-Petugas-Native.apk');
      expect(update.changelog.length, 2);
      expect(update.isUpdateAvailable(2), true);
      expect(update.isUpdateAvailable(3), false);
      expect(update.isForceUpdate(2), false);
      expect(update.isForceUpdate(0), true);
    });
  });
}
