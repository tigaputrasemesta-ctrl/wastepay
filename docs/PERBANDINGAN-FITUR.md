# Perbandingan Fitur: WastePay vs Skylite.id vs Splynx (Demo)

> Dibuat: 6 Agu 2026. Sumber: (1) situs & portal publik skylite.id (login member, daftar-mandiri, landing);
> (2) pola billing ISP skylite yang sudah direplikasi di kode WastePay (komentar kode: "pola billing ISP: skylite.id/Skymedia");
> (3) demo publik **Splynx ISP Framework** (`https://demo.splynx.com`, kredensial resmi admin/admin — data di-reset tiap 24 jam).
>
> ⚠️ Dashboard admin skylite **tidak dapat diakses publik** (butuh akun member dari berlangganan ISP).
> Splynx dipakai sebagai **baseline fitur lengkap billing ISP** karena demo-nya terbuka.

## A. Akses & Portal

| Fitur | Skylite | Splynx | WastePay |
|---|---|---|---|
| Login admin (username/password) | ❓ (internal) | ✅ admin/admin | ✅ email+password, JWT |
| 2FA / security code | ✅ captcha di login | ✅ security code 2-step | ❌ (hanya captcha di form publik) |
| Lupa password | ✅ ada (portal) | ✅ admin + reset portal customer | ❌ |
| Customer portal mandiri | ✅ (portal member Skymedia) | ✅ (Customer Portal: tagihan, bayar, tiket, reset pw) | ⚠️ cek tagihan by kode (tanpa akun) |
| Registrasi online pelanggan | ✅ GPS+foto+paket+captcha → helpdesk WA | ✅ Leads → konversi ke customer | ✅ daftar-online (GPS, foto, captcha, honeypot, rate-limit) + WA admin |
| API untuk integrasi | ❓ | ✅ (Config → Main → API) | ❌ |

## B. CRM / Pelanggan

| Fitur | Splynx | WastePay |
|---|---|---|
| CRUD pelanggan + profil detail | ✅ | ✅ (+ detail: tagihan, pembayaran, pengangkutan, komplain) |
| Custom fields (field tambahan) | ✅ (Additional fields) | ❌ |
| Label/warna status pelanggan | ✅ (Labels) | ⚠️ status saja (aktif/calon/libur/dll), tanpa warna/label custom |
| Leads (pipeline prospek) | ✅ (Leads + konversi) | ⚠️ daftar-online → calon, tanpa pipeline |
| Tiket/support pelanggan | ✅ (Tickets: kategori, prioritas, SLA) | ⚠️ komplain (tanpa prioritas/SLA?) |
| Pesan massal/individu | ✅ Email + SMS | ✅ WhatsApp (Fonnte) + template per tipe + blast + reminder cron |

## C. Billing & Keuangan

| Fitur | Splynx | WastePay |
|---|---|---|
| Tarif plan | ✅ Internet/Voice/**Recurring/One-time/Bundles** + speed (kbps) | ⚠️ paket + kategori tarif (tanpa one-time/bundles) |
| Invoice otomatis bulanan | ✅ (Finance automation, cron) | ✅ generate otomatis tgl 1 via `reminder-wa.mjs` + Task Scheduler |
| Invoice gaya skylite (PPN + denda) | — | ✅ hitungRincian (PPN 11% + denda 2%/bulan) |
| Pembayaran online gateway | ✅ (payment gateways) | ✅ **Duitku** (VA/QRIS/kartu/e-wallet/retail, HMAC-SHA256, callback, cek status) |
| Pembayaran manual/bukti | ✅ (payments) | ✅ upload bukti + verifikasi admin |
| Denda keterlambatan | ✅ (config) | ✅ 2%/bulan + tunggakan otomatis |
| Voucher | ✅ (Config → Customers → Vouchers) | ❌ |
| Laporan keuangan & operasional | ✅ (reports) | ✅ per bulan + export + rekonsiliasi harian (tunai fisik vs sistem) |
| Pairing bank/rekonsiliasi | ✅ (Finance → Pairing) | ⚠️ rekonsiliasi harian tunai (tanpa import bank) |

## D. Operasional (khas ISP vs khas sampah)

| Fitur | Splynx | WastePay |
|---|---|---|
| Router/hardware & monitoring | ✅ (Networking, monitoring, devices down) | ❌ (tidak relevan) |
| Inventory (hardware, SIM) | ✅ (Inventory) | ❌ |
| Scheduling/task | ✅ (Scheduling, tasks, work orders) | ✅ jadwal pengangkutan + rute + petugas |
| Voice/VoIP | ✅ (Voice) | ❌ |
| **Khas sampah**: pengangkutan, volume/berat, TPA | ❌ | ✅ (volume, berat, jenis sampah, TPA) |
| Komplain | ✅ tickets | ✅ komplain |

## E. Konfigurasi & Sistem

| Fitur | Splynx | WastePay |
|---|---|---|
| Pengaturan granular | ✅ sangat lengkap: localization, templates, custom translations, file manager, maps, email/SMS/portal, logrotate | ⚠️ dasar: wilayah/RT-RW, tarif per kategori, paket, gateway Duitku |
| Multi-company / reseller | ✅ (Demo company, Demo reseller) | ❌ |
| Integrations | ✅ (module integrations) | ⚠️ Duitku + WhatsApp saja |
| Role & permission | ✅ (admin levels) | ✅ RBAC 4 role (superadmin/admin/kasir/petugas) + menu filter |
| Audit log | ✅ | ✅ |
| Statistik dashboard | ✅ (online customers, devices down, system status) | ✅ (ringkasan bulanan: pelanggan, petugas, tagihan, pemasukan, dll) |

## F. Kesimpulan & Gap yang Layak Ditiru

**WastePay unggul di:** operasional sampah (pengangkutan, TPA, rute), pembayaran online Duitku lokal, WA Indonesia, RBAC+audit, rekonsiliasi tunai.

**Gap yang paling bermanfaat ditiru (prioritas):**
1. ~~**Invoice otomatis via cron**~~ ✅ **SELESAI** — generate tiap tanggal 1 + kirim WA (ada di `scripts/reminder-wa.mjs`)
2. **Custom fields pelanggan** (field tambahan dinamis)
3. **Voucher diskon** (umum di billing ISP: bayar pakai kode voucher)
4. **API publik** untuk integrasi eksternal
5. **2FA / security code** login admin
6. **Lupa password portal** (portal pelanggan ber-akun opsional)
7. **Label/status custom pelanggan** dengan warna

**Tidak relevan untuk WastePay:** networking/router/monitoring, inventory hardware, VoIP, multi-reseller.
