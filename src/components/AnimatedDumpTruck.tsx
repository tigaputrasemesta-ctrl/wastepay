"use client";

import React from "react";

type Props = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  theme?: "green" | "red" | "black" | "white" | "yellow";
  animated?: boolean;
};

export default function AnimatedDumpTruck({
  className = "",
  size = "md",
  theme = "green",
  animated = true,
}: Props) {
  // Dimensions based on size prop
  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-7 h-7",
    md: "w-10 h-10",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  }[size];

  // Theme palettes
  const colorMap = {
    green: {
      cab: "#16a34a",       // Green 600
      cabAccent: "#22c55e", // Green 500
      bed: "#eab308",       // Yellow 500
      bedAccent: "#facc15", // Yellow 400
      chassis: "#1e293b",
      wheel: "#0f172a",
      wheelHub: "#e2e8f0",
      trash: "#ef4444",
      stroke: "#000000",
    },
    red: {
      cab: "#dc2626",       // Red 600
      cabAccent: "#ef4444", // Red 500
      bed: "#16a34a",       // Green 600
      bedAccent: "#22c55e",
      chassis: "#1e293b",
      wheel: "#0f172a",
      wheelHub: "#e2e8f0",
      trash: "#eab308",
      stroke: "#000000",
    },
    yellow: {
      cab: "#eab308",
      cabAccent: "#facc15",
      bed: "#dc2626",
      bedAccent: "#ef4444",
      chassis: "#1e293b",
      wheel: "#0f172a",
      wheelHub: "#e2e8f0",
      trash: "#22c55e",
      stroke: "#000000",
    },
    black: {
      cab: "#000000",
      cabAccent: "#262626",
      bed: "#171717",
      bedAccent: "#404040",
      chassis: "#000000",
      wheel: "#000000",
      wheelHub: "#ffffff",
      trash: "#22c55e",
      stroke: "#000000",
    },
    white: {
      cab: "#ffffff",
      cabAccent: "#f4f4f5",
      bed: "#ffffff",
      bedAccent: "#e4e4e7",
      chassis: "#ffffff",
      wheel: "#ffffff",
      wheelHub: "#000000",
      trash: "#ffffff",
      stroke: "#000000",
    },
  }[theme];

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none ${sizeClasses} ${className}`}
      title="Dump Truck Sampah"
    >
      <svg
        viewBox="0 0 110 75"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        {animated && (
          <style>{`
            @keyframes truckBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-1.5px); }
            }
            @keyframes dumpAction {
              0%, 15% { transform: rotate(0deg); }
              35%, 55% { transform: rotate(-35deg); }
              75%, 100% { transform: rotate(0deg); }
            }
            @keyframes wheelSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes exhaustSmoke {
              0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
              30% { opacity: 0.8; }
              100% { transform: translate(-10px, -14px) scale(1.6); opacity: 0; }
            }
            @keyframes trashTumble {
              0%, 25% { opacity: 0; transform: translate(15px, -15px) scale(0.6) rotate(0deg); }
              35% { opacity: 1; transform: translate(5px, -5px) scale(1) rotate(-45deg); }
              55% { opacity: 0; transform: translate(-15px, 15px) scale(0.8) rotate(-120deg); }
              100% { opacity: 0; transform: translate(0, 0); }
            }
            .truck-chassis-anim {
              animation: truckBounce 1.4s ease-in-out infinite;
            }
            .dump-bed-anim {
              transform-origin: 14px 46px;
              animation: dumpAction 3.6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            }
            .wheel-anim-1 {
              transform-origin: 30px 54px;
              animation: wheelSpin 1.6s linear infinite;
            }
            .wheel-anim-2 {
              transform-origin: 70px 54px;
              animation: wheelSpin 1.6s linear infinite;
            }
            .wheel-anim-3 {
              transform-origin: 86px 54px;
              animation: wheelSpin 1.6s linear infinite;
            }
            .smoke-puff-1 {
              transform-origin: 47px 18px;
              animation: exhaustSmoke 2s ease-out infinite;
            }
            .smoke-puff-2 {
              transform-origin: 47px 18px;
              animation: exhaustSmoke 2s ease-out 0.8s infinite;
            }
            .trash-falling {
              transform-origin: 10px 40px;
              animation: trashTumble 3.6s ease-in infinite;
            }
          `}</style>
        )}

        {/* Exhaust Smoke Puffs */}
        {animated && (
          <g>
            <circle
              cx="46"
              cy="16"
              r="3.5"
              fill={theme === "white" ? "rgba(255,255,255,0.7)" : "rgba(100,116,139,0.7)"}
              className="smoke-puff-1"
            />
            <circle
              cx="45"
              cy="14"
              r="4.5"
              fill={theme === "white" ? "rgba(255,255,255,0.5)" : "rgba(148,163,184,0.5)"}
              className="smoke-puff-2"
            />
          </g>
        )}

        {/* Falling Trash particles during dump */}
        {animated && (
          <g className="trash-falling">
            <rect x="6" y="38" width="5" height="5" rx="1" fill={colorMap.trash} stroke={colorMap.stroke} strokeWidth="1" />
            <polygon points="12,42 6,45 8,36" fill={colorMap.bedAccent} stroke={colorMap.stroke} strokeWidth="1" />
            <circle cx="2" cy="40" r="2.5" fill="#3b82f6" stroke={colorMap.stroke} strokeWidth="1" />
          </g>
        )}

        <g className={animated ? "truck-chassis-anim" : ""}>
          {/* Hydraulic Cylinder (between chassis and bed) */}
          <line
            x1="52"
            y1="46"
            x2="57"
            y2="34"
            stroke="#64748b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="52"
            y1="46"
            x2="55"
            y2="38"
            stroke="#94a3b8"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* DUMP BED (Tipping Bak Truk) */}
          <g className={animated ? "dump-bed-anim" : ""}>
            {/* Trash Pile in Bed */}
            <path
              d="M12 24 Q 24 16, 38 20 Q 52 14, 68 22 L 68 28 L 12 28 Z"
              fill={colorMap.trash}
              stroke={colorMap.stroke}
              strokeWidth="2"
            />
            {/* Trash detail bags */}
            <circle cx="28" cy="21" r="4" fill="#15803d" stroke={colorMap.stroke} strokeWidth="1.5" />
            <rect x="42" y="16" width="9" height="7" rx="1" fill="#f97316" stroke={colorMap.stroke} strokeWidth="1.5" />
            <circle cx="58" cy="20" r="3.5" fill="#3b82f6" stroke={colorMap.stroke} strokeWidth="1.5" />

            {/* Main Dump Bed Body */}
            <path
              d="M 8 22 L 72 22 L 75 46 L 14 46 Z"
              fill={colorMap.bed}
              stroke={colorMap.stroke}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Dump Bed Top Lip */}
            <rect
              x="7"
              y="20"
              width="66"
              height="3.5"
              rx="1"
              fill={colorMap.bedAccent}
              stroke={colorMap.stroke}
              strokeWidth="2"
            />
            {/* Side Reinforcement Ribs (Brutalist Lines) */}
            <line x1="22" y1="24" x2="24" y2="44" stroke={colorMap.stroke} strokeWidth="2.5" />
            <line x1="36" y1="24" x2="38" y2="44" stroke={colorMap.stroke} strokeWidth="2.5" />
            <line x1="50" y1="24" x2="52" y2="44" stroke={colorMap.stroke} strokeWidth="2.5" />
            <line x1="64" y1="24" x2="66" y2="44" stroke={colorMap.stroke} strokeWidth="2.5" />

            {/* Recycle / Waste Icon Badge on Bed */}
            <circle cx="36" cy="34" r="5.5" fill="#ffffff" stroke={colorMap.stroke} strokeWidth="1.5" />
            <text
              x="36"
              y="37"
              fontSize="7"
              fontWeight="900"
              textAnchor="middle"
              fill={colorMap.stroke}
              fontFamily="sans-serif"
            >
              ♻
            </text>

            {/* Tailgate Hinge Pin */}
            <circle cx="14" cy="24" r="2" fill="#000000" />
            <circle cx="14" cy="46" r="2.5" fill="#000000" />
          </g>

          {/* CHASSIS & UNDERCARRIAGE */}
          <rect
            x="14"
            y="46"
            width="82"
            height="6"
            rx="1.5"
            fill={colorMap.chassis}
            stroke={colorMap.stroke}
            strokeWidth="2"
          />

          {/* Exhaust Pipe & Stack */}
          <path
            d="M 46 44 L 46 19 Q 46 16, 44 16 L 42 16"
            stroke={colorMap.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 46 44 L 46 20 Q 46 17, 44 17 L 42 17"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* FRONT CABIN */}
          {/* Main Cab */}
          <path
            d="M 48 24 L 78 24 Q 85 24, 89 28 L 97 37 Q 99 39, 99 43 L 99 48 L 48 48 Z"
            fill={colorMap.cab}
            stroke={colorMap.stroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Cab Roof Shield */}
          <path
            d="M 46 22 L 80 22 L 78 25 L 46 25 Z"
            fill={colorMap.cabAccent}
            stroke={colorMap.stroke}
            strokeWidth="1.5"
          />

          {/* Windshield & Side Window */}
          <path
            d="M 76 27 L 87 28 L 94 36 L 76 36 Z"
            fill="#bae6fd"
            stroke={colorMap.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Driver Window Glass Reflection */}
          <path
            d="M 52 27 L 72 27 L 72 36 L 52 36 Z"
            fill="#e0f2fe"
            stroke={colorMap.stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Driver Silhouette */}
          <circle cx="60" cy="32" r="2.5" fill="#0f172a" />
          <path d="M 56 36 Q 60 33, 64 36 Z" fill="#0f172a" />

          {/* Front Grille & Bumper */}
          <rect
            x="96"
            y="42"
            width="5"
            height="8"
            rx="1"
            fill="#0f172a"
            stroke={colorMap.stroke}
            strokeWidth="2"
          />
          {/* Headlight */}
          <polygon
            points="96,38 100,38 99,42 96,41"
            fill="#fef08a"
            stroke={colorMap.stroke}
            strokeWidth="1.5"
          />
          {/* Headlight Glow Beam */}
          <polygon
            points="100,39 108,36 108,44 100,41"
            fill="rgba(254, 240, 138, 0.4)"
          />

          {/* Door Handle */}
          <line x1="64" y1="39" x2="68" y2="39" stroke={colorMap.stroke} strokeWidth="2" strokeLinecap="round" />

          {/* Mudguards / Fenders */}
          <path
            d="M 20 48 A 12 12 0 0 1 40 48"
            stroke={colorMap.stroke}
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 60 48 A 12 12 0 0 1 80 48"
            stroke={colorMap.stroke}
            strokeWidth="2.5"
            fill="none"
          />
          <path
            d="M 76 48 A 12 12 0 0 1 96 48"
            stroke={colorMap.stroke}
            strokeWidth="2.5"
            fill="none"
          />

          {/* WHEEL 1 (Front) */}
          <g className={animated ? "wheel-anim-1" : ""}>
            <circle cx="30" cy="54" r="9" fill={colorMap.wheel} stroke={colorMap.stroke} strokeWidth="2.5" />
            <circle cx="30" cy="54" r="5" fill={colorMap.wheelHub} stroke={colorMap.stroke} strokeWidth="1.5" />
            <line x1="30" y1="49" x2="30" y2="59" stroke={colorMap.stroke} strokeWidth="1.5" />
            <line x1="25" y1="54" x2="35" y2="54" stroke={colorMap.stroke} strokeWidth="1.5" />
            <circle cx="30" cy="54" r="1.5" fill="#000000" />
          </g>

          {/* WHEEL 2 (Rear Tandem 1) */}
          <g className={animated ? "wheel-anim-2" : ""}>
            <circle cx="70" cy="54" r="9" fill={colorMap.wheel} stroke={colorMap.stroke} strokeWidth="2.5" />
            <circle cx="70" cy="54" r="5" fill={colorMap.wheelHub} stroke={colorMap.stroke} strokeWidth="1.5" />
            <line x1="70" y1="49" x2="70" y2="59" stroke={colorMap.stroke} strokeWidth="1.5" />
            <line x1="65" y1="54" x2="75" y2="54" stroke={colorMap.stroke} strokeWidth="1.5" />
            <circle cx="70" cy="54" r="1.5" fill="#000000" />
          </g>

          {/* WHEEL 3 (Rear Tandem 2) */}
          <g className={animated ? "wheel-anim-3" : ""}>
            <circle cx="86" cy="54" r="9" fill={colorMap.wheel} stroke={colorMap.stroke} strokeWidth="2.5" />
            <circle cx="86" cy="54" r="5" fill={colorMap.wheelHub} stroke={colorMap.stroke} strokeWidth="1.5" />
            <line x1="86" y1="49" x2="86" y2="59" stroke={colorMap.stroke} strokeWidth="1.5" />
            <line x1="81" y1="54" x2="91" y2="54" stroke={colorMap.stroke} strokeWidth="1.5" />
            <circle cx="86" cy="54" r="1.5" fill="#000000" />
          </g>
        </g>
      </svg>
    </div>
  );
}
