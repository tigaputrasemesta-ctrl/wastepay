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
        panel: "#1a1d21",
        asphalt: {
          DEFAULT: "#131517",
          deep: "#0e1012",
          panel: "#1a1d21",
          raised: "#21252b",
          line: "#2a2f36",
        },
        vest: {
          // safety-lime — warna rompi petugas kebersihan
          DEFAULT: "#b7e13c",
          bright: "#c9ef4e",
          dim: "#8fb322",
          deep: "#6f8d1a",
        },
        bone: {
          DEFAULT: "#e9e6dd",
          dim: "#a3a49c",
          faint: "#6d7069",
        },
        amber: {
          DEFAULT: "#f5a524",
          deep: "#b97a10",
        },
        danger: {
          DEFAULT: "#ff5c5c",
          deep: "#c23b3b",
        },
        steel: {
          DEFAULT: "#3d4550",
          dim: "#2c323a",
        },
      },
      fontFamily: {
        display: ["var(--font-anton)", "Impact", "sans-serif"],
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        stencil: "0.18em",
      },
    },
  },
  plugins: [],
} satisfies Config;
