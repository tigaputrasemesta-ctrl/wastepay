"use client";

import Link from "next/link";
import Image from "next/image";

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
  const imageSize =
    size === "sm" ? 32 :
    size === "md" ? 48 :
    size === "lg" ? 80 : 128;

  const logoContent = (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <Image
        src="/ups-heru-logo.jpg"
        alt="UPS HERU Logo"
        width={imageSize}
        height={imageSize}
        className="rounded-lg object-contain shadow-sm"
      />
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
