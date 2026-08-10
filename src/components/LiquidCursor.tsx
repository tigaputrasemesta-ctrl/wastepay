"use client";
import { useEffect, useState } from "react";

export default function LiquidCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    // Hide default cursor on body
    document.documentElement.classList.add("liquid-cursor-active");

    const moveCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === "a" ||
        target.tagName.toLowerCase() === "button" ||
        target.closest("a") ||
        target.closest("button") ||
        target.classList.contains("hover-lift")
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => setIsPressed(true);
    const handleMouseUp = () => setIsPressed(false);

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.documentElement.classList.remove("liquid-cursor-active");
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        html.liquid-cursor-active, html.liquid-cursor-active * { cursor: none !important; }
        @media (max-width: 900px), (pointer: coarse) {
          html.liquid-cursor-active, html.liquid-cursor-active * { cursor: auto !important; }
          .liquid-cursor-wrap { display: none !important; }
        }
        .liquid-cursor-wrap {
          position: fixed;
          top: 0; left: 0;
          width: 20px; height: 20px;
          border: 1px solid rgba(20, 184, 166, 0.75);
          background: radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9) 0, transparent 42%), rgba(20, 184, 166, 0.5);
          backdrop-filter: blur(3px) saturate(160%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 999999;
          transform: translate(-50%, -50%);
          transition: width 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), height 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 2px 12px rgba(20, 184, 166, 0.45), inset 0 1px 2px rgba(255, 255, 255, 0.6);
        }
        .liquid-cursor-wrap.hover {
          width: 45px; height: 45px;
          background: radial-gradient(circle at 32% 26%, rgba(255,255,255,0.9) 0, transparent 45%), rgba(20, 184, 166, 0.3);
        }
        .liquid-cursor-wrap.pressed {
          width: 15px; height: 15px;
        }
      `}} />
      <div
        className={`liquid-cursor-wrap ${isHovering ? "hover" : ""} ${isPressed ? "pressed" : ""}`}
        style={{ left: position.x, top: position.y }}
      />
    </>
  );
}
