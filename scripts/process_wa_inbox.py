#!/usr/bin/env python3
"""
Pipeline Otomatis Pengolahan Backup WhatsApp & Sinkronisasi Follow-up Pelanggan
UPS HERU Kota Depok

Fungsi:
  1. Mendeteksi file backup WhatsApp (msgstore.db, wa.db) di folder inbox.
  2. Menganalisa percakapan pesan & status centang (Centang 1, 2 Abu, Biru, Belum Chat).
  3. Menganalisa riwayat panggilan telepon (call_log: diangkat, missed call, ditolak).
  4. Menghubungkan titik koordinat Google Maps dan radar tetangga terdekat.
  5. Memperbarui alat kerja dan melakukan push otomatis ke VPS (upsheru.com/followup.html).
  6. Mengarsipkan file backup yang telah diproses.
"""

import os
import sys
import shutil
import sqlite3
import json
import datetime
import subprocess

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INBOX_DIR = r"C:\Users\o2w\Desktop\UPSHERU_WA_INBOX\inbox"
PROCESSED_DIR = r"C:\Users\o2w\Desktop\UPSHERU_WA_INBOX\processed"
FALLBACK_DIR = r"C:\Users\o2w\Desktop\CHAT WA"
EXCEL_PATH = r"C:\Users\o2w\Desktop\DATA PELANGGAN BELUM LUNAS NOPEMBER.xlsx"
MASTER_JSON_PATH = os.path.join(ROOT_DIR, "data", "followup_197_master.json")
PUBLIC_FOLLOWUP_HTML = os.path.join(ROOT_DIR, "public", "followup.html")
PUBLIC_ALAT_KERJA_HTML = os.path.join(ROOT_DIR, "public", "alat-kerja.html")
DESKTOP_HTML = r"C:\Users\o2w\Desktop\ALAT_KERJA_FOLLOWUP_UPSHERU.html"

def print_banner():
    print("=" * 70)
    print(" 🚀 UPS HERU — AUTOMATED WHATSAPP BACKUP INGEST & SYNC")
    print("    Portal Follow-up Pelanggan: https://upsheru.com/followup.html")
    print("=" * 70)

def find_backup_database():
    """Cari msgstore.db di inbox atau fallback ke folder CHAT WA"""
    inbox_files = [f for f in os.listdir(INBOX_DIR) if f.endswith('.db') or 'msgstore' in f.lower()] if os.path.exists(INBOX_DIR) else []
    
    if inbox_files:
        db_file = os.path.join(INBOX_DIR, inbox_files[0])
        print(f"\n📥 Menemukan database baru di Inbox: {inbox_files[0]}")
        return db_file, True
    
    fallback_db = os.path.join(FALLBACK_DIR, "msgstore.db")
    if os.path.exists(fallback_db):
        print(f"\n📂 Menggunakan database aktif dari: {fallback_db}")
        return fallback_db, False
    
    print("\n❌ ERROR: Tidak ada file msgstore.db di Inbox maupun folder CHAT WA!")
    print(f"   Silakan letakkan file backup WhatsApp Anda di: {INBOX_DIR}")
    return None, False

def format_ts(ts):
    if not ts or ts <= 0:
        return "-"
    try:
        return datetime.datetime.fromtimestamp(ts / 1000.0).strftime('%d/%m/%Y %H:%M')
    except Exception:
        return str(ts)

def analyze_database(db_path, existing_data_map):
    print("\n🔍 Membuka dan menganalisa database SQLite WhatsApp...")
    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # Load daftar pelanggan dari Excel jika ada, atau fallback ke existing_data_map
    customers_to_process = []
    if os.path.exists(EXCEL_PATH):
        try:
            import pandas as pd
            df = pd.read_excel(EXCEL_PATH)
            for _, row in df.iterrows():
                raw_num = str(row['No. Pelanggan']).strip().replace('.0', '')
                customers_to_process.append({
                    'nama': str(row['Nama Pelanggan']).strip(),
                    'rawPhone': raw_num,
                    'zona': str(row['Zona']).strip(),
                    'statusTagihan': str(row.get('Status', 'Tunggakan')).strip(),
                    'nominal': int(row.get('Nominal (Rp)', 50000)) if not pd.isna(row.get('Nominal (Rp)')) else 50000,
                })
            print(f"   • Berhasil memuat {len(customers_to_process)} data pelanggan dari Excel.")
        except Exception as e:
            print(f"   ⚠️ Gagal membaca Excel ({e}), menggunakan master JSON.")
            customers_to_process = list(existing_data_map.values())
    else:
        customers_to_process = list(existing_data_map.values())

    results = []

    for cust in customers_to_process:
        raw_num = cust.get('rawPhone', cust.get('phone', ''))
        name = cust['nama']
        zona = cust.get('zona', 'Area Depok')
        nominal = cust.get('nominal', 50000)

        # Pola nomor HP untuk pencarian JID
        clean = raw_num.replace('+', '').replace('-', '').replace(' ', '')
        patterns = {clean}
        if clean.startswith('8'):
            patterns.add('62' + clean)
            patterns.add('0' + clean)
        elif clean.startswith('628'):
            patterns.add(clean[2:])
            patterns.add('0' + clean[2:])
        elif clean.startswith('08'):
            patterns.add('62' + clean[1:])
            patterns.add(clean[1:])

        # 1. Cari JID
        jids = []
        for p in patterns:
            cur.execute("SELECT _id FROM jid WHERE user = ? OR raw_string LIKE ?", (p, f"%{p}%"))
            jids.extend(cur.fetchall())
        jid_ids = list({r[0] for r in jids})

        all_jids = set(jid_ids)
        if jid_ids:
            pl = ','.join('?' for _ in jid_ids)
            try:
                cur.execute(f"SELECT lid_row_id FROM jid_map WHERE jid_row_id IN ({pl})", jid_ids)
                for r in cur.fetchall(): all_jids.add(r[0])
                cur.execute(f"SELECT jid_row_id FROM jid_map WHERE lid_row_id IN ({pl})", jid_ids)
                for r in cur.fetchall(): all_jids.add(r[0])
            except Exception:
                pass

        # 2. Cari Percakapan (Message)
        messages = []
        if all_jids:
            pl_j = ','.join('?' for _ in all_jids)
            cur.execute(f"SELECT _id FROM chat WHERE jid_row_id IN ({pl_j})", list(all_jids))
            chat_ids = [r[0] for r in cur.fetchall()]

            if chat_ids:
                pl_c = ','.join('?' for _ in chat_ids)
                cur.execute(f"""
                    SELECT _id, from_me, status, timestamp, text_data
                    FROM message
                    WHERE chat_row_id IN ({pl_c})
                    ORDER BY _id ASC
                """, chat_ids)
                messages = cur.fetchall()

        # 3. Analisa Call Log (Panggilan Suara / Video)
        call_info = {"has_call": False, "summary": "-", "last_call_time": "-", "last_call_result": "-"}
        if all_jids:
            pl_call = ','.join('?' for _ in all_jids)
            try:
                cur.execute(f"""
                    SELECT _id, from_me, timestamp, video_call, duration, call_result
                    FROM call_log
                    WHERE jid_row_id IN ({pl_call})
                    ORDER BY timestamp DESC
                    LIMIT 1
                """, list(all_jids))
                c_row = cur.fetchone()
                if c_row:
                    c_id, c_from_me, c_ts, c_video, c_dur, c_res = c_row
                    c_time = format_ts(c_ts)
                    c_type = "Video" if c_video == 1 else "Suara"
                    c_dir = "Keluar (Admin)" if c_from_me == 1 else "Masuk (Warga)"
                    
                    res_map = {
                        2: "Tidak Diangkat (Missed Call)",
                        5: f"Tersambung / Bicara ({c_dur} detik)",
                        6: "Panggilan Ditolak / Dimatikan",
                        3: "Panggilan Keluar Tidak Dijawab",
                        4: "Panggilan Dibatalkan"
                    }
                    res_str = res_map.get(c_res, f"Hasil Kode {c_res}")
                    call_info = {
                        "has_call": True,
                        "summary": f"{c_time}: {c_dir} {c_type} — {res_str}",
                        "last_call_time": c_time,
                        "last_call_result": res_str,
                        "duration": c_dur
                    }
            except Exception as e:
                pass

        admin_msgs = [m for m in messages if m[1] == 1]
        cust_msgs = [m for m in messages if m[1] == 0]

        # 4. Analisa Centang Terakhir
        centang_status = "Tidak Ada Chat"
        cat_code = "belum_chat"
        cat_label = "Belum Ada Chat"
        cat_color = "#f97316"
        cat_icon = "🟠"
        priority = 2
        kendala = "Nomor HP ini belum pernah tersambung ke WhatsApp Business penagih atau belum pernah dikirimi invoice."
        status_janji = "Belum ada riwayat kontak"
        rekomendasi = "Kirim pesan pengingat tagihan perdana atau verifikasi nomor ke tetangga."

        if admin_msgs:
            last_adm = admin_msgs[-1]
            cur.execute("SELECT receipt_timestamp, read_timestamp FROM receipt_user WHERE message_row_id = ?", (last_adm[0],))
            rc = cur.fetchone()

            is_read = False
            is_delivered = False

            if rc:
                rec_ts, read_ts = rc
                if read_ts and read_ts > 0: is_read = True
                elif rec_ts and rec_ts > 0: is_delivered = True
            else:
                if last_adm[2] in [13, 14]: is_read = True
                elif last_adm[2] in [5, 6]: is_delivered = True

            if len(cust_msgs) > 0:
                cat_code = "ada_respon"
                cat_label = "Ada Respon / Janji Bayar"
                cat_color = "#10b981"
                cat_icon = "🟢"
                priority = 5
                centang_status = "Ada Respon Pelanggan"
                
                # Cek isi pesan pelanggan untuk janji / komplain
                all_text = " ".join([m[4] for m in cust_msgs if m[4]]).lower()
                if any(w in all_text for w in ['janji', 'besok', 'minggu depan', 'gajian', 'tgl', 'tanggal', 'nanti']):
                    status_janji = "Janji Bayar Tertunda"
                    kendala = "Pelanggan sudah membalas chat dan menyampaikan janji pembayaran."
                    rekomendasi = "Konfirmasi kembali realisasi janji bayar atau jadwalkan jemput kas."
                elif any(w in all_text for w in ['komplain', 'angkut', 'lewat', 'truk', 'sampah', 'bau', 'telat']):
                    status_janji = "Komplain Layanan Sampah"
                    kendala = "Pelanggan menyampaikan keluhan operasional pengangkutan sampah."
                    rekomendasi = "Koordinasikan dengan driver zona untuk penjemputan sampah sebelum penagihan."
                elif any(w in all_text for w in ['sudah', 'lunas', 'transfer', 'titip', 'petugas']):
                    status_janji = "Klaim Sudah Membayar"
                    kendala = "Pelanggan mengklaim sudah bayar tunai/transfer, perlu verifikasi pembukuan."
                    rekomendasi = "Cek mutasi kas petugas atau minta foto struk kuitansi pembayaran."
                else:
                    status_janji = "Sudah Merespon"
                    kendala = "Pelanggan pernah berinteraksi via WhatsApp."
                    rekomendasi = "Follow-up sapaan dan kirimkan tautan invoice QRIS."

            elif is_read:
                cat_code = "ghosting"
                cat_label = "Centang Biru (Ghosting)"
                cat_color = "#3b82f6"
                cat_icon = "🔵"
                priority = 3
                centang_status = "Centang 2 Biru (Sudah Dibaca)"
                kendala = "Pesan penagihan terakhir sudah DIBACA (Centang Biru) namun pelanggan belum membalas sama sekali."
                status_janji = "Dibaca tapi diabaikan"
                rekomendasi = "Lakukan panggilan telepon suara langsung atau kunjungi ke alamat rumah."
            elif is_delivered:
                cat_code = "centang2_abu"
                cat_label = "Centang 2 Abu (Belum Dibuka)"
                cat_color = "#64748b"
                cat_icon = "⚪"
                priority = 4
                centang_status = "Centang 2 Abu-abu (Terkirim)"
                kendala = "Pesan sudah masuk ke HP pelanggan (Centang 2 Abu), namun aplikasi belum dibuka/dibaca."
                status_janji = "Pesan terkirim belum dibuka"
                rekomendasi = "Kirim pesan pengingat singkat atau hubungi via panggilan telepon biasa."
            else:
                cat_code = "centang1"
                cat_label = "Centang 1 (Tidak Aktif/Salah)"
                cat_color = "#ef4444"
                cat_icon = "🔴"
                priority = 1
                centang_status = "Centang 1 (Tidak Aktif / Mati)"
                kendala = "Pesan penagihan hanya centang 1 (nomor tidak aktif, salah nomor, atau diblokir)."
                status_janji = "Nomor tidak dapat dihubungi"
                rekomendasi = "Konfirmasi nomor HP baru ke tetangga terdekat atau datangi alamat rumah."

        # Ambil data enrichment lama jika ada (agar alamat, koordinat, dan tetangga tidak hilang)
        clean_key = clean.lstrip('0').replace('62', '')
        old_data = existing_data_map.get(clean_key, {})

        display_phone = '0' + clean.lstrip('0').replace('62', '')
        wa_phone = '62' + clean.lstrip('0').replace('62', '')
        invoice_no = f"INV/{display_phone}/202611"
        invoice_url = f"https://upsheru.com/bayar-tagihan?invoice={invoice_no}"

        results.append({
            'nama': name,
            'phone': display_phone,
            'waPhone': wa_phone,
            'rawPhone': raw_num,
            'zona': zona,
            'nominal': nominal,
            'catCode': cat_code,
            'catLabel': cat_label,
            'catColor': cat_color,
            'catIcon': cat_icon,
            'priority': priority,
            'statusCentang': centang_status,
            'totalKirim': len(admin_msgs),
            'totalRespon': len(cust_msgs),
            'kendala': kendala,
            'statusJanji': status_janji,
            'rekomendasi': rekomendasi,
            'callInfo': call_info,
            'alamat': old_data.get('alamat', f"Area {zona}, Kel. Cilodong"),
            'patokan': old_data.get('patokan', '-'),
            'lat': old_data.get('lat', -6.432432),
            'lng': old_data.get('lng', 106.833271),
            'gmapsUrl': old_data.get('gmapsUrl', f"https://www.google.com/maps?q={old_data.get('lat', -6.432432)},{old_data.get('lng', 106.833271)}"),
            'invoiceNo': invoice_no,
            'invoiceUrl': invoice_url,
            'messageText': old_data.get('messageText', f"Halo Bapak/Ibu {name}, pengingat iuran sampah UPS HERU {invoice_no}. Tautan bayar QRIS: {invoice_url}"),
            'tetangga': old_data.get('tetangga', [])
        })

    con.close()

    # Urutkan berdasarkan prioritas: Centang 1, Belum Chat, Ghosting, Centang 2 Abu, Ada Respon
    results.sort(key=lambda x: (x['priority'], x['zona'], x['nama']))
    for idx, c in enumerate(results):
        c['id'] = idx + 1
        c['displayId'] = idx + 1

    return results

def save_and_rebuild(results):
    print("\n💾 Menyimpan hasil analisa ke data/followup_197_master.json...")
    with open(MASTER_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("🔨 Mengompilasi ulang halaman HTML follow-up...")
    generator_script = os.path.join(ROOT_DIR, "scripts", "generate-followup-tool.cjs")
    if os.path.exists(generator_script):
        subprocess.run(["node", generator_script], check=True, cwd=ROOT_DIR)
        print("   ✅ Berhasil memperbarui public/followup.html & Desktop HTML.")
    else:
        print("   ⚠️ Script generator generate-followup-tool.cjs tidak ditemukan.")

def push_to_vps():
    print("\n🌐 Mendorong (push) perubahan ke GitHub & Auto-Deploy VPS SumoPod...")
    try:
        subprocess.run(["git", "add", "data/followup_197_master.json", "public/followup.html", "public/alat-kerja.html"], check=True, cwd=ROOT_DIR)
        
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        commit_msg = f"chore(followup): auto-update customers from WhatsApp backup [{now_str}]"
        
        # Cek apakah ada perubahan untuk dicommit
        res = subprocess.run(["git", "diff", "--staged", "--quiet"], cwd=ROOT_DIR)
        if res.returncode != 0:
            subprocess.run(["git", "commit", "-m", commit_msg], check=True, cwd=ROOT_DIR)
            print("   📥 Menyelaraskan dengan remote (git pull --rebase)...")
            subprocess.run(["git", "-c", "credential.helper=", "pull", "--rebase", "origin", "master"], check=True, cwd=ROOT_DIR)
            print("   📤 Menjalankan git push origin master...")
            subprocess.run(["git", "-c", "credential.helper=", "push", "origin", "master"], check=True, cwd=ROOT_DIR)
            print("   ✅ Push sukses! GitHub Actions sedang me-restart container VPS secara live.")
        else:
            print("   ℹ️ Tidak ada perubahan data baru dibandingkan versi server (Sudah up-to-date).")
    except Exception as e:
        print(f"   ⚠️ Push Git gagal otomatis ({e}). File lokal tetap ter-update.")

def archive_inbox_file(db_path, is_from_inbox):
    if is_from_inbox and os.path.exists(db_path):
        ts_folder = datetime.datetime.now().strftime("backup_%Y%m%d_%H%M%S")
        target_dir = os.path.join(PROCESSED_DIR, ts_folder)
        os.makedirs(target_dir, exist_ok=True)
        filename = os.path.basename(db_path)
        shutil.move(db_path, os.path.join(target_dir, filename))
        print(f"\n📦 File backup dipindahkan ke arsip: {os.path.join(PROCESSED_DIR, ts_folder)}")

def main():
    print_banner()

    db_path, is_from_inbox = find_backup_database()
    if not db_path:
        return

    # Load data master existing agar koordinat dan tetangga tetap utuh
    existing_map = {}
    if os.path.exists(MASTER_JSON_PATH):
        try:
            with open(MASTER_JSON_PATH, 'r', encoding='utf-8') as f:
                arr = json.load(f)
                for item in arr:
                    phone_clean = item.get('phone', '').lstrip('0').replace('62', '')
                    existing_map[phone_clean] = item
        except Exception:
            pass

    results = analyze_database(db_path, existing_map)

    # Hitung ringkasan kategori
    counts = {}
    for r in results:
        k = r['catLabel']
        counts[k] = counts.get(k, 0) + 1

    print("\n📊 RINGKASAN HASIL ANALISA PELANGGAN:")
    print("-" * 50)
    for cat, cnt in counts.items():
        print(f"   • {cat:<35}: {cnt} pelanggan")
    print("-" * 50)
    print(f"   TOTAL PELANGGAN                   : {len(results)} orang")

    save_and_rebuild(results)
    push_to_vps()
    archive_inbox_file(db_path, is_from_inbox)

    print("\n" + "=" * 70)
    print(" 🎉 PROSES UPDATE SELESAI DENGAN SUKSES!")
    print(" 📱 Buka portal follow-up di HP Anda sekarang:")
    print("    👉 https://upsheru.com/followup.html")
    print("=" * 70)

if __name__ == '__main__':
    main()
