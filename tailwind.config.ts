import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: "rgba(3,4,11,0.8)",
        asphalt: {
          DEFAULT: "#000000",
          deep: "#030811", // instead of rgba
          panel: "#07121a", // instead of rgba
          raised: "#0c1d29", // instead of rgba
          line: "#183b4c", // instead of rgba
        },
        vest: {
          DEFAULT: "#39ff14", // neon-lime
          bright: "#4aff24",
          dim: "#22c55e",
          deep: "#166534",
        },
        bone: {
          DEFAULT: "#ffffff",
          dim: "#cbd5e1", // slate-300
          faint: "#64748b", // slate-500
        },
        amber: {
          DEFAULT: "#fcee0a", // neon-yellow
          deep: "#ca8a04",
        },
        danger: {
          DEFAULT: "#ff00ea", // neon-pink
          deep: "#be185d",
        },
        steel: {
          DEFAULT: "#334155",
          dim: "#1e293b",
        },
      },
      fontFamily: {
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        stencil: "0.18em",
      },
    },
  },
  plugins: [],
} satisfies Config;
