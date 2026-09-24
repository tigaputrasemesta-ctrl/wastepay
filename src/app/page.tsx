import React from 'react';
import Link from 'next/link';
import { Truck, CalendarCheck, ShieldCheck, Smartphone, MapPin, Phone } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-8 w-8 text-emerald-600" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">WastePay<span className="text-emerald-600">.</span></span>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-medium text-sm text-slate-600">
            <Link href="#layanan" className="hover:text-emerald-600 transition-colors">Layanan</Link>
            <Link href="#keunggulan" className="hover:text-emerald-600 transition-colors">Keunggulan</Link>
            <Link href="#jadwal" className="hover:text-emerald-600 transition-colors">Jadwal Truk</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors">Masuk</Link>
            <Link href="/register" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm shadow-emerald-200">
              Daftar Sekarang
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - SEO Optimized */}
      <section className="relative pt-20 pb-28 lg:pt-32 lg:pb-40 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-6">
            <MapPin className="h-4 w-4" />
            Layanan Buang Sampah Terdekat di Depok
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6">
            Jasa Angkut Sampah Depok <span className="text-emerald-600">Profesional & Tepat Waktu</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Solusi kebersihan lingkungan Anda. Kami menyediakan layanan jasa angkut sampah teratur untuk perumahan, RT/RW, dan perusahaan. Lacak jadwal truk sampah dan bayar retribusi sampah Depok secara online dengan mudah.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/pesan" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg shadow-emerald-300 flex items-center justify-center gap-2">
              <Truck className="h-5 w-5" />
              Pesan Layanan Sekarang
            </Link>
            <Link href="/kontak" className="w-full sm:w-auto bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50 text-slate-700 px-8 py-4 rounded-full text-lg font-semibold transition-all flex items-center justify-center gap-2">
              <Phone className="h-5 w-5" />
              Hubungi CS Kami
            </Link>
          </div>
        </div>
      </section>

      {/* Features / Keunggulan */}
      <section id="keunggulan" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Mengapa Memilih Jasa Angkut Sampah Kami?</h2>
            <p className="text-slate-600 text-lg">Layanan modern yang dirancang untuk memberikan ketenangan pikiran bagi warga dan pengurus lingkungan.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 group">
              <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Jadwal Truk Sampah Teratur</h3>
              <p className="text-slate-600 leading-relaxed">
                Tidak ada lagi sampah menumpuk. Jadwal pengangkutan rutin yang bisa Anda pantau langsung dari handphone.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 group">
              <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Bayar Retribusi Online</h3>
              <p className="text-slate-600 leading-relaxed">
                Sistem pembayaran retribusi sampah Depok terintegrasi. Transparan, aman, dan tanpa repot siapkan uang tunai.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-emerald-100 transition-all duration-300 group">
              <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Layanan Profesional & Resmi</h3>
              <p className="text-slate-600 leading-relaxed">
                Armada terawat dan petugas kebersihan yang profesional. Kami menjamin lingkungan Anda bersih dan asri.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content Section / Artikel Singkat */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="prose prose-lg prose-emerald mx-auto text-slate-600 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Layanan Buang Sampah Terdekat untuk Warga Depok</h2>
            <p className="mb-4">
              Mencari <strong>jasa angkut sampah Depok</strong> yang bisa diandalkan kini semakin mudah. WastePay hadir sebagai platform penyedia layanan kebersihan modern yang menjembatani warga dengan petugas pengangkut sampah. Kami memahami bahwa kebersihan lingkungan adalah prioritas utama.
            </p>
            <p>
              Dengan WastePay, Anda tidak perlu lagi khawatir memikirkan kapan petugas datang atau kesulitan mengumpulkan iuran <strong>retribusi sampah Depok</strong>. Semua bisa diakses secara digital. Dapatkan informasi <strong>jadwal truk sampah</strong> secara real-time dan nikmati lingkungan yang lebih sehat.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-emerald-700 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-emerald-600 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-emerald-800 rounded-full blur-3xl opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Siap Membuat Lingkungan Anda Lebih Bersih?</h2>
          <p className="text-emerald-100 text-lg mb-10">Bergabunglah dengan ratusan RT/RW di Depok yang telah beralih ke layanan angkut sampah digital kami.</p>
          <Link href="/register" className="inline-block bg-white text-emerald-700 px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-50 transition-colors shadow-xl">
            Mulai Berlangganan Sekarang
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-6 w-6 text-emerald-500" />
              <span className="text-xl font-bold text-white tracking-tight">WastePay<span className="text-emerald-500">.</span></span>
            </div>
            <p className="mb-4 max-w-sm">
              Platform Jasa Angkut Sampah Depok No. 1. Membantu digitalisasi pengelolaan retribusi sampah dan layanan kebersihan.
            </p>
            <p className="text-sm">© {new Date().getFullYear()} WastePay Indonesia. All rights reserved.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Layanan</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Angkut Sampah Perumahan</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Layanan Buang Sampah Komersil</Link></li>
              <li><Link href="#" className="hover:text-emerald-400 transition-colors">Jadwal Truk Sampah</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Kontak</h4>
            <ul className="space-y-2 text-sm">
              <li>Jl. Margonda Raya, Depok</li>
              <li>halo@wastepay.id</li>
              <li>0812-3456-7890</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
