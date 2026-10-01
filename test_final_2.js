const payload = {
  nama: "Test Vercel Success 2",
  noTelepon: "088899900033",
  kategori: "level_1",
  kecamatan: "Sukmajaya",
  kelurahan: "Mekar Jaya",
  alamat: "Jalan Testing Final No. 8",
  rt: "08",
  rw: "09",
  patokanLokasi: "Samping masjid",
  ruteId: "22",
  zonaId: "99999", // non-existent zona to trigger 500 error IF code is updated
  jadwalHari: "Senin",
  fotoRumah: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  latitude: -6.4025,
  longitude: 106.8275,
  tanggalPenagihanCustom: "15"
};

fetch("https://upsheru.com/api/publik/daftar", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
.then(r => r.json().then(data => ({ status: r.status, data })))
.then(console.log)
.catch(console.error);
