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
    color: "bg-emerald-100 text-emerald-800",
  },
  {
    quote:
      "Bayar tinggal scan QRIS, struk resmi langsung masuk chat WhatsApp otomatis. Gak pernah lagi ada drama uang receh atau petugas nagih pas kita lagi gak di rumah.",
    name: "Pak Anto",
    role: "Warga Cluster",
    area: "Beji, Depok",
    badge: "Langganan 4 Tahun",
    initials: "PA",
    color: "bg-amber-100 text-amber-800",
  },
  {
    quote:
      "Pernah sampah telat keangkut pas libur panjang lebaran, tinggal foto dan lapor lewat fitur geotag di web, gak sampai 1 jam petugas reaksi cepat langsung meluncur bereskan.",
    name: "Mas Dimas",
    role: "Warga Perumahan",
    area: "Grand Depok City",
    badge: "Pelanggan Aktif",
    initials: "MD",
    color: "bg-blue-100 text-blue-800",
  },
  {
    quote:
      "Buat pengelola usaha kuliner kayak saya, kepastian jadwal angkut tiap pagi itu penyelamat. Gak ada lagi bau sampah numpuk di depan ruko yang bikin risih pelanggan kafe.",
    name: "Mbak Rina",
    role: "Owner Coffee Shop",
    area: "Margonda Raya",
    badge: "Pelaku Usaha",
    initials: "MR",
    color: "bg-rose-100 text-rose-800",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="border-b border-slate-200/80 bg-white py-20 px-6 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-full mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Suara Warga & Pelanggan
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
              Testimoni Warga <span className="text-emerald-600">Kota Depok.</span>
            </h2>
            <p className="text-slate-600 text-base md:text-lg font-normal max-w-xl mt-2">
              Cerita nyata dari warga dan pelaku usaha di Depok yang telah menikmati kepastian jadwal penjemputan sampah harian.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-2xl shadow-sm self-start md:self-auto">
            <span className="text-amber-500 text-sm">★★★★★</span>
            <span className="text-slate-800">Rating 4.9 / 5.0 dari 2.000+ Pelanggan</span>
          </div>
        </div>

        {/* Testimonials Grid (2x2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-3xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-emerald-300 p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div>
                {/* Stars & Badge */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div className="flex gap-1 text-amber-500 text-sm">
                    {"★".repeat(5)}
                  </div>
                  <span className="inline-block px-2.5 py-1 bg-white border border-slate-200 text-[11px] font-bold text-slate-700 rounded-full shadow-sm">
                    {t.badge}
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              {/* Author Info */}
              <div className="pt-4 border-t border-slate-200/60 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-sm ${t.color}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                      {t.name}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {t.role}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800 rounded-full">
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
