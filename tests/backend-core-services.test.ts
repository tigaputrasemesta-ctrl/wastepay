import { describe, it, expect } from 'vitest';
import {
  buildCorsHeaders,
  assertAuthorizedRole,
  calculateCustomerBillingAndPickupRule,
  extractTail10Digits,
  maskAddressForPublicView,
  getJakartaDateBounds,
  resolveOfficerStatusHariIni,
  sanitizeExcelCellValue,
  validateFillBatchLimit,
} from '@/lib/server/wastepay-backend-core-services';

describe('WastePay Backend Hardened Core Services', () => {
  describe('Domain 1: Auth, RBAC Guard & CORS Builder', () => {
    it('mengizinkan origin Capacitor Android https://localhost', () => {
      const mockReq = new Request('https://wastepay.vercel.app/api/pengaturan', {
        headers: { origin: 'https://localhost' },
      });
      const headers = buildCorsHeaders(mockReq);
      expect(headers['Access-Control-Allow-Origin']).toBe('https://localhost');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('assertAuthorizedRole bersifat case-insensitive untuk role ADMIN & SUPERADMIN', () => {
      expect(assertAuthorizedRole({ role: 'ADMIN' }, ['admin']).authorized).toBe(true);
      expect(assertAuthorizedRole({ role: 'SuperAdmin' }, ['admin']).authorized).toBe(true);
      expect(assertAuthorizedRole({ role: 'kasir' }, ['admin']).authorized).toBe(false);
      expect(assertAuthorizedRole(null, ['admin']).authorized).toBe(false);
    });
  });

  describe('Domain 3: Billing Engine & Rules', () => {
    it('membulatkan Pajak Daerah ke Rupiah penuh dan menerapkan plafon denda', () => {
      const res = calculateCustomerBillingAndPickupRule({
        tarifPokok: 35000,
        unpaidMonthsCount: 1,
        pajakDaerahRatePct: 10,
        dendaRatePct: 2,
        maksDendaPctDariPokok: 50,
      });

      expect(res.pajakDaerahNominal).toBe(3500); // 10% dari 35.000
      expect(res.dendaNominal).toBe(700); // 2% dari 35.000
      expect(res.totalTagihan).toBe(39200);
      expect(res.isEligibleForPickup).toBe(true);
    });

    it('menangguhkan pengangkutan jika tunggakan >= batas toleransi (2 bulan)', () => {
      const res = calculateCustomerBillingAndPickupRule({
        tarifPokok: 50000,
        unpaidMonthsCount: 3,
        batasBulanStopAngkut: 2,
      });

      expect(res.isEligibleForPickup).toBe(false);
      expect(res.alasanPenangguhan).toContain('3 bulan');
    });

    it('mencegah date rollover pada bulan Februari (kunci <= 28)', () => {
      const res = calculateCustomerBillingAndPickupRule({
        tarifPokok: 40000,
        unpaidMonthsCount: 0,
        tanggalTagihanCustom: 31,
        targetYear: 2026,
        targetMonth: 2, // Februari
      });

      expect(res.jatuhTempoDate.getUTCDate()).toBeLessThanOrEqual(28);
    });
  });

  describe('Domain 4: WhatsApp Search Normalization & Address Masking', () => {
    it('mengekstraksi 10 digit terakhir nomor WhatsApp dari berbagai format', () => {
      expect(extractTail10Digits('081234567890')).toBe('1234567890');
      expect(extractTail10Digits('+62 812-3456-7890')).toBe('1234567890');
      expect(extractTail10Digits('6281234567890')).toBe('1234567890');
      expect(extractTail10Digits('0812 3456 7890')).toBe('1234567890');
    });

    it('menyamarkan nomor rumah dan RT/RW untuk portal publik (UU PDP)', () => {
      const masked = maskAddressForPublicView('Jl. Margonda Raya No. 45 RT 03/RW 05');
      expect(masked).not.toContain('45');
      expect(masked).not.toContain('03');
      expect(masked).toContain('No. **');
      expect(masked).toContain('RT **');
    });
  });

  describe('Domain 5: Asia/Jakarta (WIB) Date Boundaries & Attendance Status', () => {
    it('menggeser waktu ke UTC+7 secara deterministik sehingga jam 06:00 WIB terhitung hari ini', () => {
      // 06:00 WIB tgl 18 Okt 2026 = 23:00 UTC tgl 17 Okt 2026
      const sampleUtc = new Date(Date.UTC(2026, 9, 17, 23, 0, 0));
      const bounds = getJakartaDateBounds(sampleUtc);

      expect(bounds.tanggalWibString).toBe('2026-10-18');
      expect(bounds.nowWibHours).toBe(6);
    });

    it('resolveOfficerStatusHariIni mengembalikan union status yang tepat', () => {
      expect(resolveOfficerStatusHariIni(null)).toBe('BELUM_ABSEN');
      expect(resolveOfficerStatusHariIni({ waktuMasuk: new Date(), waktuSelesai: null, status: 'hadir' })).toBe('HADIR');
      expect(resolveOfficerStatusHariIni({ waktuMasuk: new Date(), waktuSelesai: new Date(), status: 'hadir' })).toBe('SELESAI');
      expect(resolveOfficerStatusHariIni({ waktuMasuk: new Date(), status: 'izin' })).toBe('IZIN');
    });
  });

  describe('Domain 7: Excel Formula Injection Sanitization & Batch Limits', () => {
    it('menetralisir karakter berbahaya formula injection (=, +, -, @)', () => {
      expect(sanitizeExcelCellValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeExcelCellValue('+cmd|...')).toBe("'+cmd|...");
      expect(sanitizeExcelCellValue('Budi Santoso')).toBe('Budi Santoso');
    });

    it('validateFillBatchLimit melempar error jika batch > 250 baris', () => {
      const normalArray = new Array(250).fill({});
      expect(() => validateFillBatchLimit(normalArray, 250)).not.toThrow();

      const oversizedArray = new Array(251).fill({});
      expect(() => validateFillBatchLimit(oversizedArray, 250)).toThrow(/melampaui batas maksimum/);
    });
  });
});
