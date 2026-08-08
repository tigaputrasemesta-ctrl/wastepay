// Link akun login petugas ke profil lapangan + set jabatan (dev DB)
import { createClient } from "@libsql/client";
const c = createClient({ url: "file:dev.db" });

// 1) Profil Petugas untuk akun login role=petugas
const u = await c.execute("SELECT id, nama FROM User WHERE role='petugas' ORDER BY id LIMIT 1");
if (u.rows[0]) {
  const uid = u.rows[0].id;
  const sudah = await c.execute("SELECT id FROM Petugas WHERE userId = ?", [uid]);
  if (sudah.rows.length === 0) {
    const w = await c.execute(
      "SELECT id FROM Wilayah WHERE kelurahan='Beji' AND kecamatan='Beji' ORDER BY id LIMIT 1"
    );
    await c.execute(
      "INSERT INTO Petugas (nama, noTelepon, email, jabatan, aktif, wilayahId, userId, createdAt, updatedAt) VALUES (?,?,?,?,1,?,?, datetime('now'), datetime('now'))",
      ["Petugas Rudi", "081234567899", "petugas.herozerowaste@gmail.com", "angkut,tagih,survei", w.rows[0].id, uid]
    );
    console.log("Profil Petugas Rudi dibuat + link userId", uid);
  } else {
    console.log("Profil sudah ada");
  }
}

// 2) Jabatan untuk petugas dummy lama
const j = [["angkut"], ["angkut,tagih"], ["angkut,survei"], ["angkut"]];
const ps = await c.execute("SELECT id FROM Petugas ORDER BY id");
for (let i = 0; i < Math.min(ps.rows.length, 4); i++) {
  await c.execute("UPDATE Petugas SET jabatan=? WHERE id=?", [j[i][0], ps.rows[i].id]);
}

const chk = await c.execute("SELECT id, nama, jabatan, userId FROM Petugas ORDER BY id");
for (const r of chk.rows) console.log(`  ${r.id} | ${r.nama} | ${r.jabatan}${r.userId ? " | [login ter-link]" : ""}`);
