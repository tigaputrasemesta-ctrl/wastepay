const payload = {
  nama: "Test AI Auto",
  noTelepon: "089999888777",
  kategori: "level_1",
  kecamatan: "Sukmajaya",
  kelurahan: "Mekar Jaya",
  alamat: "Jalan Testing Sistem No. 99",
  rt: "01",
  rw: "02",
  patokanLokasi: "Dekat lapangan",
  ruteId: "22",
  jadwalHari: "Selasa,Kamis",
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
