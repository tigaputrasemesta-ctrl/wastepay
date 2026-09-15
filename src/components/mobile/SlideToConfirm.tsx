"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { vibrate } from "@/lib/mobile-feedback";

type SlideToConfirmProps = {
  text: string;
  successText?: string;
  onConfirm: () => Promise<void> | void;
  variant?: "success" | "danger" | "warning";
  disabled?: boolean;
  className?: string;
};

export default function SlideToConfirm({
  text,
  successText = "Memproses...",
  onConfirm,
  variant = "success",
  disabled = false,
  className = "",
}: SlideToConfirmProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const maxDragRef = useRef(0);

  const updateMaxDrag = useCallback(() => {
    if (trackRef.current) {
      const trackWidth = trackRef.current.clientWidth;
      const thumbWidth = 48; // Lebar tombol pegangan (w-12 = 48px)
      maxDragRef.current = Math.max(0, trackWidth - thumbWidth - 8); // 8px total padding kiri-kanan
    }
  }, []);

  useEffect(() => {
    updateMaxDrag();
    window.addEventListener("resize", updateMaxDrag);
    return () => window.removeEventListener("resize", updateMaxDrag);
  }, [updateMaxDrag]);

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isConfirmed || loading) return;
    updateMaxDrag();
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX - dragX;
    vibrate("pickup");
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || disabled || isConfirmed || loading) return;
    const currentX = e.touches[0].clientX;
    const newX = Math.min(Math.max(0, currentX - startXRef.current), maxDragRef.current);
    setDragX(newX);
  };

  const handleTouchEnd = async () => {
    if (!isDragging || disabled || isConfirmed || loading) return;
    setIsDragging(false);

    // Threshold konfirmasi: 80% dari batas maksimal geser
    const threshold = maxDragRef.current * 0.8;
    if (dragX >= threshold && maxDragRef.current > 0) {
      setDragX(maxDragRef.current);
      setIsConfirmed(true);
      setLoading(true);
      vibrate("success");
      try {
        await onConfirm();
      } catch {
        // Jika gagal, kembalikan posisi slider
        setDragX(0);
        setIsConfirmed(false);
      } finally {
        setLoading(false);
      }
    } else {
      // Batal / snap back
      setDragX(0);
    }
  };

  // Mouse Handlers (untuk testing di desktop browser / mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isConfirmed || loading) return;
    updateMaxDrag();
    setIsDragging(true);
    startXRef.current = e.clientX - dragX;
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || disabled || isConfirmed || loading) return;
      const currentX = e.clientX;
      const newX = Math.min(Math.max(0, currentX - startXRef.current), maxDragRef.current);
      setDragX(newX);
    },
    [isDragging, disabled, isConfirmed, loading]
  );

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || disabled || isConfirmed || loading) return;
    setIsDragging(false);

    const threshold = maxDragRef.current * 0.8;
    if (dragX >= threshold && maxDragRef.current > 0) {
      setDragX(maxDragRef.current);
      setIsConfirmed(true);
      setLoading(true);
      vibrate("success");
      try {
        await onConfirm();
      } catch {
        setDragX(0);
        setIsConfirmed(false);
      } finally {
        setLoading(false);
      }
    } else {
      setDragX(0);
    }
  }, [dragX, isDragging, disabled, isConfirmed, loading, onConfirm]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Color Styles
  const theme = {
    success: {
      trackBg: "bg-emerald-950/80 border-emerald-500/40",
      fillBg: "bg-emerald-700/60",
      thumbBg: "bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-emerald-900/50",
      text: "text-emerald-300",
      icon: "✓",
    },
    danger: {
      trackBg: "bg-rose-950/80 border-rose-500/40",
      fillBg: "bg-rose-600/60",
      thumbBg: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/50",
      text: "text-rose-300",
      icon: "🚫",
    },
    warning: {
      trackBg: "bg-amber-950/80 border-amber-500/40",
      fillBg: "bg-amber-600/60",
      thumbBg: "bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-amber-900/50",
      text: "text-amber-300",
      icon: "⚠️",
    },
  }[variant];

  const progressPercent = maxDragRef.current > 0 ? (dragX / maxDragRef.current) * 100 : 0;

  return (
    <div className={`relative select-none ${className}`}>
      <div
        ref={trackRef}
        className={`relative h-14 rounded-2xl p-1 flex items-center overflow-hidden border transition-all ${theme.trackBg} ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        {/* Active Fill Behind Thumb */}
        <div
          className={`absolute left-0 top-0 bottom-0 ${theme.fillBg} transition-all duration-75`}
          style={{ width: `${dragX + 24}px` }}
        />

        {/* Center Prompt Text */}
        <div
          className={`absolute inset-0 flex items-center justify-center font-black text-xs sm:text-sm tracking-wide transition-opacity pointer-events-none ${theme.text}`}
          style={{ opacity: Math.max(0, 1 - progressPercent / 60) }}
        >
          <span className="flex items-center gap-2">
            <span>{loading ? successText : text}</span>
            <span className="animate-pulse">❯❯❯</span>
          </span>
        </div>

        {/* Draggable Thumb */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg transition-transform active:scale-95 touch-none select-none ${
            theme.thumbBg
          } ${isDragging ? "transition-none" : "transition-transform duration-250 ease-out"}`}
          style={{
            transform: `translateX(${dragX}px)`,
          }}
        >
          {loading ? (
            <div className="w-5 h-5 border-[3px] border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{theme.icon}</span>
          )}
        </div>
      </div>
    </div>
  );
}
