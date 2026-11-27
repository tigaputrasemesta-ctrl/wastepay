"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ClientPortalProps {
  children: ReactNode;
  lockScroll?: boolean;
  onClose?: () => void;
}

export function ClientPortal({ children, lockScroll = true, onClose }: ClientPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !lockScroll) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, lockScroll, onClose]);

  if (!mounted) return null;

  return createPortal(children, document.body);
}
export default ClientPortal;
