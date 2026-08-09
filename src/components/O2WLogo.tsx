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
  const textSize = 
    size === "sm" ? "text-2xl" : 
    size === "md" ? "text-4xl" : 
    size === "lg" ? "text-6xl" : "text-8xl";

  const logoContent = (
    <div className={`relative inline-block ${className}`}>
      {/* Glitch layer behind */}
      <h1 className={`font-black font-display tracking-tighter ${textSize} text-transparent absolute top-0 left-0 glitch-text opacity-40`}>
        O2W
      </h1>
      
      {/* Main text */}
      <h1 className={`font-black font-display tracking-tighter ${textSize} text-white relative z-10 flex items-baseline`}>
        <span className="text-[var(--neon-cyan)] neon-pulse transition-colors duration-700" style={{ textShadow: "0 0 15px var(--neon-cyan)" }}>
          O
        </span>
        <span className="text-[var(--neon-pink)] neon-pulse transition-colors duration-700" style={{ textShadow: "0 0 15px var(--neon-pink)", animationDelay: "0.4s" }}>
          2
        </span>
        <span className="text-[var(--neon-yellow)] neon-pulse transition-colors duration-700" style={{ textShadow: "0 0 15px var(--neon-yellow)", animationDelay: "0.8s" }}>
          W
        </span>
      </h1>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-block hover:scale-105 transition-transform duration-300">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}
