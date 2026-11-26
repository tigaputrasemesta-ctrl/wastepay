import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyKomplainToken } from "@/lib/komplain-token";
import SelesaiForm from "./SelesaiForm";
import { AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Konfirmasi Penjemputan Sampah | Petugas Lapangan",
  description: "Halaman konfirmasi 1-klik penjemputan sampah lapangan.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HalamanSelesaiKomplain({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id: idStr } = await params;
  const { t: token } = await searchParams;

  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    notFound();
  }

  const komplain = await prisma.komplain.findUnique({
    where: { id },
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          alamat: true,
          noTelepon: true,
          kodePelanggan: true,
          patokanLokasi: true,
          rtRw: true,
          latitude: true,
          longitude: true,
          kelurahan: { select: { nama: true } },
          wilayah: { select: { nama: true, zona: { select: { nama: true } } } },
        },
      },
    },
  });

  if (!komplain) {
    notFound();
  }

  const isValidToken = verifyKomplainToken(token, komplain.id, komplain.pelangganId);

  if (!isValidToken) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 md:p-8 text-center border border-rose-100">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Tautan Tidak Valid</h1>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Tautan konfirmasi penjemputan ini salah atau sudah kedaluwarsa. Mohon gunakan tautan resmi yang dikirimkan melalui pesan WhatsApp dinas Anda.
          </p>
          <div className="text-xs text-slate-400 bg-slate-50 py-2 px-3 rounded-lg border border-slate-200">
            ID Tiket: #KMP-{komplain.id}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100/90 py-6 px-4 sm:px-6">
      <div className="max-w-lg mx-auto">
        <SelesaiForm komplain={komplain} token={token || ""} />
      </div>
    </main>
  );
}
