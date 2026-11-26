"use client";

import { useState } from "react";

export default function ProductImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackSrc = "/images/upsheru-product-fallback.svg",
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        setImgSrc(fallbackSrc);
      }}
    />
  );
}
