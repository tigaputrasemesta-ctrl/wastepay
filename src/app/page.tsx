import Link from "next/link";
import { Heart, Truck, MapPin, Smartphone, ArrowRight, Megaphone } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  type PengumumanRingkas = {
    id: number;
    judul: string;
    isi: string;
    penting: boolean;
    createdAt: Date;
  };
  let pengumuman: PengumumanRingkas[] = [];
  try {
    pengumuman = await prisma.pengumuman.findMany({
      where: { untukWilayahId: null },
      orderBy: [{ penting: "desc" }, { createdAt: "desc" }],
      take: 3
    });
  } catch {
    // ignore
  }
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-red-500 selection:text-white pb-20">
      
      {/* Marquee Banner */}
      <div className="hm-marquee text-lg font-bold uppercase tracking-[0.2em] sticky top-0 z-50">
        <div className="hm-marquee-content">
          <span>O₂W HERO ZERO WASTE</span>
          <span>❤️</span>
          <span>DEPOK BERSIH 2026</span>
          <span>❤️</span>
          <span>SISTEM PENGELOLAAN SAMPAH</span>
          <span>❤️</span>
          <span>O₂W HERO ZERO WASTE</span>
          <span>❤️</span>
          <span>DEPOK BERSIH 2026</span>
          <span>❤️</span>
          <span>SISTEM PENGELOLAAN SAMPAH</span>
          <span>❤️</span>
        </div>
      </div>

      {/* Navbar */}
      <nav className="border-b-2 border-black px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-white z-40 relative">
        <div className="flex items-center gap-2">
          <Heart className="w-8 h-8 fill-red-600 text-red-600" />
          <span className="text-3xl font-black tracking-tighter">O₂W HERO.</span>
        </div>
        <div className="flex gap-6 font-bold uppercase tracking-widest text-sm">
          <Link href="/bayar" className="hover:text-red-600 transition-colors">Tagihan</Link>
          <Link href="/pengaduan" className="hover:text-red-600 transition-colors">Komplain</Link>
          <Link href="/daftar" className="text-green-600 hover:text-black transition-colors">Daftar</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 py-12 md:py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="order-2 md:order-1">
            <div className="inline-block px-4 py-1 border-2 border-black font-bold uppercase text-xs mb-6 bg-[#f4f4f0]">
              Edisi 2026 / Kota Depok
            </div>
            <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.85] tracking-tighter mb-8">
              Bebas<br/>
              <span className="text-green-600">Sampah.</span><br/>
              Tanpa<br/>
              <span className="text-red-600">Pusing.</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium mb-8 max-w-lg leading-snug">
              Buang cara lama. Bergabunglah dengan sistem retribusi & angkut sampah otomatis kami. Jadwal pasti, bayar gampang.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/daftar" className="hm-btn-red text-lg flex items-center justify-center gap-2">
                GABUNG SEKARANG <Heart className="w-5 h-5 fill-white" />
              </Link>
              <Link href="/pengaduan" className="hm-btn flex items-center justify-center gap-2">
                CARA KERJA <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div className="order-1 md:order-2 relative hm-card p-0 overflow-hidden group bg-green-50 h-[400px] md:h-[500px] flex items-center justify-center">
            <div className="absolute top-4 left-4 z-10 bg-white hm-border px-3 py-1 font-bold text-xs uppercase flex items-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse border border-black"></span>
              Live Tracking
            </div>
            
            {/* SVG Brutalist Map Animation */}
            <svg className="w-full h-full p-8" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
              <defs>
                <style>
                  {`
                    .route-path {
                      stroke-dasharray: 1000;
                      stroke-dashoffset: 1000;
                      animation: drawPath 4s linear infinite alternate;
                    }
                    @keyframes drawPath {
                      0% { stroke-dashoffset: 1000; }
                      100% { stroke-dashoffset: 0; }
                    }
                    .truck-move {
                      animation: moveTruck 8s linear infinite;
                    }
                    @keyframes moveTruck {
                      0% { transform: translate(50px, 350px) rotate(-45deg); }
                      25% { transform: translate(150px, 250px) rotate(0deg); }
                      50% { transform: translate(300px, 250px) rotate(-90deg); }
                      75% { transform: translate(300px, 100px) rotate(-180deg); }
                      100% { transform: translate(100px, 100px) rotate(0deg); }
                    }
                  `}
                </style>
              </defs>
              
              {/* Background Grid */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2"/>
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
              
              {/* Map Zones */}
              <rect x="40" y="40" width="120" height="120" fill="#fca5a5" stroke="black" strokeWidth="4" />
              <text x="60" y="80" fontFamily="monospace" fontWeight="bold" fontSize="14" fill="black">ZONE A</text>
              <rect x="240" y="200" width="120" height="120" fill="#fef08a" stroke="black" strokeWidth="4" />
              <text x="260" y="240" fontFamily="monospace" fontWeight="bold" fontSize="14" fill="black">ZONE B</text>

              {/* The Route */}
              <path 
                className="route-path"
                d="M 50 350 L 150 250 L 300 250 L 300 100 L 100 100" 
                fill="none" 
                stroke="black" 
                strokeWidth="12" 
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <path 
                className="route-path"
                d="M 50 350 L 150 250 L 300 250 L 300 100 L 100 100" 
                fill="none" 
                stroke="#22c55e" 
                strokeWidth="6" 
                strokeLinecap="square"
                strokeLinejoin="miter"
              />

              {/* Checkpoints */}
              <circle cx="50" cy="350" r="10" fill="black" />
              <circle cx="150" cy="250" r="10" fill="white" stroke="black" strokeWidth="4" />
              <circle cx="300" cy="250" r="10" fill="white" stroke="black" strokeWidth="4" />
              <circle cx="300" cy="100" r="10" fill="white" stroke="black" strokeWidth="4" />
              <circle cx="100" cy="100" r="12" fill="#ef4444" stroke="black" strokeWidth="4" />

              {/* Moving Truck (Emoji or SVG icon) */}
              <g className="truck-move">
                <rect x="-15" y="-15" width="30" height="30" fill="white" stroke="black" strokeWidth="3" />
                <text x="-10" y="5" fontSize="20">🚛</text>
              </g>
            </svg>
          </div>
        </div>
      </main>

      {/* Pengumuman Section */}
      {pengumuman.length > 0 && (
        <section className="border-t-2 border-black bg-yellow-400 py-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <Megaphone className="w-10 h-10 fill-black" />
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Papan Pengumuman</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {pengumuman.map((p) => (
                <div key={p.id} className={`hm-card p-6 ${p.penting ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                  {p.penting && (
                    <div className="inline-block px-2 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest mb-3">
                      PENTING
                    </div>
                  )}
                  <h3 className="text-xl font-black uppercase mb-3 leading-tight">{p.judul}</h3>
                  <p className="font-medium text-sm leading-relaxed mb-4">{p.isi}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                    {p.createdAt.toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="border-y-2 border-black bg-[#f4f4f0] py-20 px-6 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <Heart className="w-10 h-10 fill-black" />
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">Fitur Utama</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            
            {/* Feature 1 */}
            <div className="hm-card bg-white">
              <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center bg-blue-100 mb-6">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-3">Lacak Posisi Truk</h3>
              <p className="font-medium text-lg leading-snug">
                Pantau pergerakan armada secara real-time. Tidak ada lagi drama nunggu truk sampah yang tak kunjung datang.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="hm-card bg-white">
              <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center bg-red-100 mb-6">
                <Truck className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-3">Lapor & Geotag</h3>
              <p className="font-medium text-lg leading-snug">
                Sampah terlewat? Foto dan kirim. Sistem Geotag akan melacak lokasi akurat Anda, dan unit reaksi cepat meluncur hari itu juga.
              </p>
              <Link href="/pengaduan" className="inline-block mt-4 border-b-2 border-black font-bold uppercase text-sm hover:text-red-600 hover:border-red-600">
                Lapor Sekarang
              </Link>
            </div>

            {/* Feature 3 */}
            <div className="hm-card bg-white">
              <div className="w-16 h-16 border-2 border-black rounded-full flex items-center justify-center bg-green-100 mb-6">
                <Smartphone className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-3">Notif WhatsApp</h3>
              <p className="font-medium text-lg leading-snug">
                Lupa bayar? Asisten Bot kami siap mengingatkan. Struk juga langsung dikirim ke chat WA Anda. Tarif flat Rp 50.000/bulan!
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="max-w-6xl mx-auto px-6 mt-20 text-center">
        <h2 className="text-4xl md:text-6xl font-black uppercase mb-6 tracking-tighter">
          Sudah Siap <br/> <span className="text-red-600">Zero Waste?</span>
        </h2>
        <Link href="/daftar" className="hm-btn-green text-xl py-4 px-12 inline-block shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          GABUNG O₂W SEKARANG
        </Link>
        <div className="mt-20 pt-8 border-t-2 border-black flex flex-col md:flex-row justify-between items-center font-bold uppercase tracking-widest text-xs">
          <span>© 2026 HERO ZERO WASTE DEPOK</span>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="/bayar" className="hover:text-red-600">Cek Tagihan</Link>
            <Link href="/pengaduan" className="hover:text-red-600">Pusat Bantuan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
