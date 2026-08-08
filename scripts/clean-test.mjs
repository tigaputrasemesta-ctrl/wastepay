// Hapus data test sesi (calon P-099999) — dev only
import { createClient } from "@libsql/client";
const c = createClient({ url: "file:dev.db" });
const r = await c.execute("SELECT id FROM Pelanggan WHERE kodePelanggan='P-099999'");
if (r.rows[0]) {
  const id = r.rows[0].id;
  await c.execute("DELETE FROM AuditLog WHERE entitas='Pelanggan' AND entitasId=?", [id]);
  await c.execute("DELETE FROM Pelanggan WHERE id=?", [id]);
  console.log("calon test dihapus");
} else console.log("tidak ada calon test");
