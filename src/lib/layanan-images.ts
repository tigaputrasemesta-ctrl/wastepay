import { getPengaturanString } from "./pengaturan";

export const DEFAULT_IMG_RUMAH_TANGGA = "/images/layanan/rumah-tangga.jpg";
export const DEFAULT_IMG_NIAGA = "/images/layanan/niaga-usaha.jpg";
export const DEFAULT_IMG_RT_RW = "/images/layanan/rt-rw-kolektif.jpg";

export interface LayananImages {
  rumahTangga: string;
  niaga: string;
  rtRw: string;
}

export async function getLayananImages(): Promise<LayananImages> {
  const [rumahTangga, niaga, rtRw] = await Promise.all([
    getPengaturanString("LANDING_IMG_RUMAH_TANGGA", DEFAULT_IMG_RUMAH_TANGGA),
    getPengaturanString("LANDING_IMG_NIAGA", DEFAULT_IMG_NIAGA),
    getPengaturanString("LANDING_IMG_RT_RW", DEFAULT_IMG_RT_RW),
  ]);

  return {
    rumahTangga: rumahTangga || DEFAULT_IMG_RUMAH_TANGGA,
    niaga: niaga || DEFAULT_IMG_NIAGA,
    rtRw: rtRw || DEFAULT_IMG_RT_RW,
  };
}
