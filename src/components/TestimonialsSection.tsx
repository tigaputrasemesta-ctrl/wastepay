"use client";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  area: string;
  badge: string;
  initials: string;
  color: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Dari dulu ribet nunggu tukang sampah yang gak jelas harinya. Sekarang tinggal buka aplikasi dari HP, posisi truk sampai mana dan jam berapa tiba udah langsung kelihatan.",
    name: "Bu Sari",
    role: "Ibu Rumah Tangga",
    area: "Sawangan, Depok",
    badge: "Warga Terverifikasi",
    initials: "BS",
    color: "bg-emerald-300",
  },
  {
    quote:
      "Bayar tinggal scan QRIS, struk resmi langsung masuk chat WhatsApp otomatis. Gak pernah lagi ada drama uang receh atau petugas nagih pas kita lagi gak di rumah.",
    name: "Pak Anto",
    role: "Warga Cluster",
    area: "Beji, Depok",
    badge: "Langganan 4 Tahun",
    initials: "PA",
    color: "bg-yellow-300",
  },
  {
    quote:
      "Pernah sampah telat keangkut pas libur panjang lebaran, tinggal foto dan lapor lewat fitur geotag di web, gak sampai 1 jam petugas reaksi cepat langsung meluncur bereskan.",
    name: "Mas Dimas",
    role: "Warga Perumahan",
    area: "Grand Depok City",
    badge: "Pelanggan Aktif",
    initials: "MD",
    color: "bg-blue-300",
  },
  {
    quote:
      "Buat pengelola usaha kuliner kayak saya, kepastian jadwal angkut tiap pagi itu penyelamat. Gak ada lagi bau sampah numpuk di depan ruko yang bikin risih pelanggan kafe.",
    name: "Mbak Rina",
    role: "Owner Coffee Shop",
    area: "Margonda Raya",
    badge: "Pelaku Usaha",
    initials: "MR",
    color: "bg-rose-300",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="border-b-2 border-black bg-[#f8fafc] py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-block px-3 py-1 bg-emerald-500 text-black border-2 border-black font-black uppercase text-xs tracking-widest mb-3 shadow-[2px_2px_0_0_#000]">
              SUARA KOMUNITAS
            </span>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter text-black leading-tight">
              Kata Warga <span className="text-emerald-600">Depok.</span>
            </h2>
            <p className="text-gray-700 text-base md:text-lg font-medium max-w-xl mt-2">
              Cerita nyata dari tetangga dan pelaku usaha di Depok yang sudah lebih dulu bebas dari drama sampah harian.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs font-black uppercase bg-white border-2 border-black px-4 py-2.5 shadow-[3px_3px_0_0_#000] self-start md:self-auto">
            <span className="text-amber-500 text-sm">★★★★★</span>
            <span>RATING 4.9/5 DARI 2.000+ WARGA</span>
          </div>
        </div>

        {/* Testimonials Grid (2x2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="hm-card bg-white p-6 sm:p-8 flex flex-col justify-between border-2 border-black shadow-[6px_6px_0_0_#000] hover:shadow-[8px_8px_0_0_#059669] hover:-translate-y-1 transition-all"
            >
              <div>
                {/* Stars & Badge */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex gap-1 text-amber-500 text-sm">
                    {"★".repeat(5)}
                  </div>
                  <span className="inline-block px-2.5 py-0.5 bg-[#f4f4f0] border border-black text-[10px] font-black uppercase tracking-wider text-gray-800">
                    {t.badge}
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-base sm:text-lg font-bold text-gray-900 leading-snug mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-4 border-t-2 border-black/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 border-2 border-black rounded-full flex items-center justify-center font-black text-sm text-black shadow-[2px_2px_0_0_#000] ${t.color}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base uppercase text-black leading-tight">
                      {t.name}
                    </h4>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t.role}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-emerald-100/80 border border-emerald-500 text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                    📍 {t.area}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
