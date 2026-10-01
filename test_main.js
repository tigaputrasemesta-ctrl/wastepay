const payload = {
  nama: "Test Main Branch",
  noTelepon: "088811122233",
  kategori: "level_1",
  kecamatan: "Sukmajaya",
  kelurahan: "Mekar Jaya",
  alamat: "Jalan Testing Main No. 11",
  rt: "03",
  rw: "04",
  patokanLokasi: "Depan rumah",
  ruteId: "22",
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
