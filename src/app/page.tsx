import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils";

const LAYANAN = [
  {
    no: "01",
    judul: "Angkut Rutin Terjadwal",
    desc: "Sampah rumah tangga & usaha diangkut sesuai jadwal wilayah Anda — tidak perlu menunggu, tidak menumpuk.",
  },
  {
    no: "02",
    judul: "Kartu Anggota & Kode Unik",
    desc: "Setiap rumah mendapat kartu anggota berisi kode unik — dipakai untuk cek tagihan & lapor keluhan online.",
  },
  {
    no: "03",
    judul: "Tagihan Bulanan yang Jelas",
    desc: "Biaya layanan tetap per bulan sesuai kategori. Cek tagihan kapan saja lewat website — tanpa aplikasi.",
  },
  {
    no: "04",
    judul: "Pembayaran Fleksibel",
    desc: "Bayar tunai ke petugas/kasir, transfer, QRIS, e-wallet, atau virtual account — semua ada bukti tercatat.",
  },
  {
    no: "05",
    judul: "Pengingat Otomatis via WhatsApp",
    desc: "Pengingat tagihan & konfirmasi pembayaran dikirim langsung ke WhatsApp Anda. Tidak ada tagihan terlewat.",
  },
  {
    no: "06",
    judul: "Lapor Keluhan, Ditindaklanjuti",
    desc: "Sampah tidak diangkut atau menumpuk? Lapor sekali, tim lapangan langsung menindaklanjuti.",
  },
];

const CARA_BAYAR = [
  {
    judul: "Tunai",
    desc: "Bayar langsung ke petugas pengangkut atau kasir — bukti pembayaran tercatat otomatis.",
  },
  {
    judul: "Transfer / QRIS / E-wallet",
    desc: "Transfer ke rekening pengelola lalu unggah bukti lewat halaman Cek Tagihan.",
  },
  {
    judul: "Bayar Online (Duitku)",
    desc: "Pilih VA, QRIS, atau e-wallet saat cek tagihan — bayar langsung dari link, tanpa datang ke mana-mana.",
  },
  {
    judul: "Konfirmasi Otomatis",
    desc: "Pembayaran terverifikasi & dilaporkan ke WhatsApp Anda. Simpan bukti untuk arsip.",
  },
];

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Preview tarif — ambil 4 kategori termurah untuk landing.
  let previewTarif: { kategori: string; label: string; tarif: number }[] = [];
  let tarifMin = 0;
  try {
    const k = await prisma.kategoriTarif.findMany({
      orderBy: { tarif: "asc" },
      select: { kategori: true, label: true, tarif: true },
    });
    tarifMin = k.length > 0 ? Math.min(...k.map((x) => x.tarif)) : 0;
    previewTarif = k.slice(0, 4);
  } catch {
    // DB offline — landing tetap tampil tanpa angka tarif
  }

  return (
    <div className="text-bone">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-asphalt-deep border-b border-asphalt-line">
        <span
          aria-hidden
          className="absolute -right-6 top-1/2 -translate-y-1/2 font-display text-[30vw] leading-none text-bone/[0.03] select-none pointer-events-none"
        >
          UPS
        </span>
        <div className="hazard h-1.5 opacity-80" aria-hidden />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <p className="stencil text-vest flex items-center gap-2 animate-reveal-up">
            <span className="w-8 h-1.5 hazard inline-block" />
            O2W Hero Zero Waste · Layanan Pengelolaan Sampah — Kota Depok
          </p>
          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl tracking-wide leading-[0.95] mt-6 animate-reveal-up d-1">
            Sampah Beres.
            <br />
            <span className="text-vest">Lingkungan Sehat.</span>
          </h1>
          <p className="max-w-xl text-bone-dim mt-6 text-base sm:text-lg leading-relaxed animate-reveal-up d-2">
            Kami mengangkut sampah rumah tangga & usaha Anda secara rutin dan
            terjadwal — mulai <span className="text-vest font-mono">{formatRupiah(tarifMin)}</span> per
            bulan. Cek tagihan, bayar, dan lapor keluhan cukup dari HP.
          </p>
          <div className="flex flex-wrap gap-3 mt-9 animate-reveal-up d-3">
            <Link href="/bayar" className="btn btn-primary chamfer-sm px-7 py-3.5">
              Cek Tagihan Saya
            </Link>
            <Link href="/daftar" className="btn chamfer-sm px-7 py-3.5">
              Daftar Layanan
            </Link>
            <Link href="/pengaduan" className="btn chamfer-sm px-7 py-3.5 !text-danger hover:!text-vest">
              Lapor Sampah Menumpuk
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-10 font-mono text-[11px] text-bone-faint uppercase tracking-widest animate-reveal-up d-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-vest animate-blink" /> Angkut rutin per jadwal
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-vest animate-blink" /> Tagihan transparan
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-vest animate-blink" /> Cek & bayar online
            </span>
          </div>
        </div>
      </section>

      {/* ═══ TENTANG LAYANAN ═══ */}
      <section id="tentang" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto text-center">
          <p className="stencil text-vest flex items-center justify-center gap-2">
            <span className="w-8 h-1.5 hazard inline-block" /> Tentang Layanan
          </p>
          <h2 className="font-display text-3xl sm:text-5xl tracking-wide mt-4 leading-tight">
            Sampah Anda, <span className="text-vest">tanggung jawab kami.</span>
          </h2>
          <p className="text-bone-dim leading-relaxed mt-6 text-base max-w-2xl mx-auto">
            Kami adalah unit pengelola sampah yang melayani warga & pelaku usaha
            di wilayah Kota Depok. Sampah dari rumah Anda diangkut sesuai jadwal,
            dicatat, dan dikirim ke tempat pembuangan akhir — tanpa Anda harus
            repot memikirkan siapa yang mengangkut dan berapa yang harus dibayar.
          </p>
          <div className="panel mt-8 p-6 text-left">
            <p className="stencil text-bone-faint mb-4">Keunggulan bagi Warga</p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-bone-dim">
              {[
                "Rutin & tepat jadwal — sampah tidak menumpuk",
                "Tarif tetap & transparan, tanpa biaya tersembunyi",
                "Cek tagihan & bayar dari HP, tanpa antre",
                "Konfirmasi & pengingat otomatis via WhatsApp",
                "Keluhan ditindaklanjuti cepat oleh tim lapangan",
                "Survei & aktivasi dibantu petugas wilayah",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2.5">
                  <span className="text-vest mt-0.5">▸</span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ═══ LAYANAN / KEUNGGULAN ═══ */}
      <section id="layanan" className="border-y border-asphalt-line bg-asphalt-deep/50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <p className="stencil text-vest flex items-center gap-2">
                <span className="w-8 h-1.5 hazard inline-block" /> Layanan
              </p>
              <h2 className="font-display text-3xl sm:text-5xl tracking-wide mt-4">
                Apa yang Anda <span className="text-vest">dapatkan</span>?
              </h2>
            </div>
            <p className="stencil text-bone-faint">LAYANAN PELANGGAN</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAYANAN.map((f, i) => (
              <div key={f.no} className={`panel p-5 flex flex-col animate-reveal-up d-${(i % 3) + 1} group`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-2xl text-vest">{f.no}</span>
                  <span className="w-8 h-1.5 hazard opacity-40" aria-hidden />
                </div>
                <h3 className="font-display text-base tracking-wide group-hover:text-vest transition-colors">
                  {f.judul}
                </h3>
                <p className="text-sm text-bone-dim mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ TARIF (PREVIEW) ═══ */}
      <section id="tarif" className="border-b border-asphalt-line bg-asphalt-deep/50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <p className="stencil text-amber flex items-center gap-2">
                <span className="w-8 h-1.5 bg-amber inline-block" /> Tarif Layanan
              </p>
              <h2 className="font-display text-3xl sm:text-5xl tracking-wide mt-4">
                Biaya <span className="text-amber">tetap & transparan</span>.
              </h2>
            </div>
            <Link href="/tarif" className="btn chamfer-sm px-6 py-3">
              Lihat Semua Tarif →
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {previewTarif.length === 0 ? (
              <div className="panel p-6 text-sm text-bone-faint font-mono">
                Daftar tarif sedang diperbarui — lihat halaman tarif atau hubungi petugas wilayah.
              </div>
            ) : (
              previewTarif.map((k, i) => (
                <div
                  key={k.kategori}
                  className={`panel p-5 flex items-center justify-between gap-4 animate-reveal-up d-${(i % 2) + 1} ${
                    i === 0 ? "border-vest/40" : ""
                  }`}
                >
                  <div>
                    <p className="font-display text-base tracking-wide text-bone">{k.label}</p>
                    {i === 0 && (
                      <p className="stencil text-[9px] text-vest mt-1">PALING TERJANGKAU</p>
                    )}
                  </div>
                  <p className="font-display text-2xl text-vest whitespace-nowrap">
                    {formatRupiah(k.tarif)}
                    <span className="text-xs text-bone-faint">/bln</span>
                  </p>
                </div>
              ))
            )}
            <div className="panel p-5 flex flex-col justify-center gap-3 bg-asphalt-deep/60 animate-reveal-up d-2">
              <p className="text-sm text-bone-dim leading-relaxed">
                Tarif lengkap untuk 8 kategori & paket layanan (angkut 2×–7×
                seminggu) tersedia di halaman tarif.
              </p>
              <Link href="/daftar" className="btn btn-primary chamfer-sm justify-center py-3">
                Daftar Sekarang
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CARA BAYAR ═══ */}
      <section id="bayar" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 scroll-mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="stencil text-vest flex items-center gap-2">
              <span className="w-8 h-1.5 hazard inline-block" /> Pembayaran
            </p>
            <h2 className="font-display text-3xl sm:text-5xl tracking-wide mt-4">
              Bayar iuran <span className="text-vest">semudah mungkin</span>.
            </h2>
          </div>
          <Link href="/bayar" className="btn chamfer-sm px-6 py-3">
            Cek & Bayar Tagihan →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CARA_BAYAR.map((b, i) => (
            <div key={b.judul} className={`panel p-5 flex flex-col animate-reveal-up d-${(i % 4) + 1}`}>
              <span className="font-display text-2xl text-vest">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="font-display text-base tracking-wide mt-3">{b.judul}</h3>
              <p className="text-sm text-bone-dim mt-2 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA DAFTAR ═══ */}
      <section className="border-y border-asphalt-line bg-asphalt-deep/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="panel p-8 flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
            <span
              aria-hidden
              className="absolute -right-4 top-1/2 -translate-y-1/2 font-display text-[8rem] leading-none text-bone/[0.04] select-none pointer-events-none"
            >
              O2W
            </span>
            <div className="relative">
              <p className="stencil text-vest mb-2">MULAI BERLANGGANAN</p>
              <h2 className="font-display text-2xl sm:text-4xl tracking-wide leading-tight">
                Daftar layanan — <span className="text-vest">gratis</span>,
                <br className="hidden sm:block" /> tanpa biaya pendaftaran.
              </h2>
              <p className="text-sm text-bone-dim mt-3 max-w-xl">
                Isi form pendaftaran online, petugas kami akan menghubungi Anda
                untuk survei lokasi & aktivasi layanan.
              </p>
            </div>
            <Link
              href="/daftar"
              className="btn btn-primary chamfer-sm px-8 py-4 text-base relative"
            >
              Daftar Layanan →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ PENGADUAN (TEASER) ═══ */}
      <section id="pengaduan" className="border-b border-asphalt-line bg-asphalt-deep/50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="stencil text-danger flex items-center gap-2">
                <span className="w-8 h-1.5 bg-danger inline-block" />
                PELAPORAN WARGA
              </p>
              <h2 className="font-display text-3xl sm:text-5xl tracking-wide mt-4">
                Sampah tidak diangkut?{" "}
                <span className="text-danger">Lapor sekarang.</span>
              </h2>
              <p className="text-bone-dim mt-5 leading-relaxed">
                Masukkan kode anggota Anda, tulis keluhannya, dan laporan langsung
                diteruskan ke tim lapangan — statusnya bisa dipantau sampai selesai.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-bone-dim">
                {[
                  "Diteruskan langsung ke tim lapangan wilayah Anda",
                  "Status bisa dipantau: baru → diproses → selesai",
                  "Konfirmasi tindak lanjut via WhatsApp",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="text-vest mt-0.5">▸</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="panel p-6 text-center animate-reveal-up d-2">
              <p className="stencil text-danger mb-3">FORM PELAPORAN</p>
              <p className="text-sm text-bone-dim leading-relaxed mb-6">
                Form pelaporan warga tersedia di halaman khusus — cukup siapkan
                kode anggota Anda.
              </p>
              <Link href="/pengaduan" className="btn btn-danger chamfer-sm w-full justify-center py-3.5">
                Lapor Sampah →
              </Link>
              <p className="text-[11px] text-bone-faint mt-3 font-mono">
                Kode anggota ada di kartu anggota / barcode Anda
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ KONTAK & CTA ═══ */}
      <section id="kontak" className="scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="panel p-6">
              <p className="stencil text-vest mb-4">LAYANAN PELANGGAN</p>
              <div className="space-y-3 text-sm font-mono text-bone-dim">
                <p className="flex justify-between gap-4 border-b border-asphalt-line/60 pb-3">
                  <span className="stencil text-bone-faint text-[10px]">HARI KERJA</span>
                  <span>Senin – Sabtu, 08.00 – 16.00</span>
                </p>
                <p className="flex justify-between gap-4 border-b border-asphalt-line/60 pb-3">
                  <span className="stencil text-bone-faint text-[10px]">WHATSAAPP</span>
                  <span className="text-vest">{process.env.COMPANY_WHATSAPP?.trim() || "08xx-xxxx-xxxx"}</span>
                </p>
                <p className="flex justify-between gap-4 border-b border-asphalt-line/60 pb-3">
                  <span className="stencil text-bone-faint text-[10px]">EMAIL</span>
                  <span>{process.env.COMPANY_EMAIL?.trim() || "halo@o2whero.id"}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span className="stencil text-bone-faint text-[10px]">KANTOR</span>
                  <span>{process.env.COMPANY_ADDRESS?.trim() || "Kota Depok, Jawa Barat"}</span>
                </p>
              </div>
            </div>
            <div className="panel p-6 flex flex-col justify-center relative overflow-hidden">
              <span
                aria-hidden
                className="absolute -right-4 top-1/2 -translate-y-1/2 font-display text-[9rem] leading-none text-bone/[0.04] select-none pointer-events-none"
              >
                UPS
              </span>
              <p className="stencil text-vest mb-2">SUDAH PUNYA KODE ANGGOTA?</p>
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide">
                Cek tagihan & bayar iuran <span className="text-vest">dari HP Anda.</span>
              </h2>
              <p className="text-sm text-bone-dim mt-3 leading-relaxed">
                Masukkan kode anggota di kartu Anda — lihat tagihan, denda, dan
                status pembayaran dalam hitungan detik.
              </p>
              <div className="flex flex-wrap gap-3 mt-6">
                <Link href="/bayar" className="btn btn-primary chamfer-sm px-6 py-3">
                  Cek Tagihan Saya
                </Link>
                <Link href="/daftar" className="btn chamfer-sm px-6 py-3">
                  Daftar Layanan
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
