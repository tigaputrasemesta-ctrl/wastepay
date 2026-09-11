"use client";

import Link from "next/link";

type Props = {
  size?: "sm" | "md" | "lg" | "xl";
  href?: string | null;
  className?: string;
};

export default function O2WLogo({
  size = "md",
  href = null,
  className = "",
}: Props) {
  const badgeSize =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" :
    size === "md" ? "px-2 py-0.5 text-xs" :
    size === "lg" ? "px-3 py-1 text-sm" : "px-4 py-1.5 text-base";

  const textSize =
    size === "sm" ? "text-xl" :
    size === "md" ? "text-3xl" :
    size === "lg" ? "text-5xl" : "text-7xl";

  const logoContent = (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <span className={`bg-emerald-600 text-white font-bold tracking-wider rounded-lg ${badgeSize} shadow-2xs`}>
        UPS
      </span>
      <span className={`font-black font-display tracking-tight text-slate-900 ${textSize}`}>
        HERU<span className="text-emerald-600">.</span>
      </span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-block hover:translate-x-0.5 hover:-translate-y-0.5 transition-transform">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
