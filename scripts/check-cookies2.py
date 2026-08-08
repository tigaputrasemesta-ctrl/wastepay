import sqlite3, os, shutil, tempfile

BASE = r"C:\Users\Administrator\AppData\Local\Google\Chrome\User Data"
TMP = tempfile.gettempdir()

for prof in ["Default", "Profile 1", "Profile 2", "duitku-cdp/Default"]:
    src = os.path.join(BASE, prof, "Network", "Cookies") if not prof.startswith("duitku") else os.path.join(BASE, prof, "Network", "Cookies")
    label = prof
    if not os.path.exists(src):
        print(f"=== {label} === (tidak ada)")
        continue
    dst = os.path.join(TMP, f"ck_{label.replace(' ', '_').replace('/', '_')}.db")
    try:
        shutil.copy2(src, dst)
        db = sqlite3.connect(dst)
        rows = db.execute("SELECT host_key, name FROM cookies WHERE host_key LIKE '%duitku%' ORDER BY host_key LIMIT 20").fetchall()
        print(f"=== {label} ===")
        if not rows:
            print("  (tidak ada cookie duitku)")
        for r in rows:
            print("  ", r[0], "|", r[1])
        db.close()
    except Exception as e:
        print(f"=== {label} === ERR: {e}")
    finally:
        try: os.remove(dst)
        except: pass
