import sqlite3, os, sys

BASE = r"C:\Users\Administrator\AppData\Local\Google\Chrome\User Data"

for prof in ["Default", "Profile 1", "Profile 2"]:
    dbpath = os.path.join(BASE, prof, "Network", "Cookies")
    print(f"=== {prof} ({dbpath}) ===")
    if not os.path.exists(dbpath):
        print("  (file tidak ada)")
        continue
    try:
        db = sqlite3.connect(f"file:{dbpath}?mode=ro", uri=True)
        rows = db.execute(
            "SELECT host_key, name FROM cookies WHERE host_key LIKE '%duitku%' ORDER BY host_key LIMIT 20"
        ).fetchall()
        if not rows:
            print("  (tidak ada cookie duitku)")
        for r in rows:
            print("  ", r[0], "|", r[1])
        db.close()
    except Exception as e:
        print("  ERR:", e)
