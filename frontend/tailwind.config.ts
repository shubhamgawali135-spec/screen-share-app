import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0F14",
        surface: "#121821",
        "surface-raised": "#182130",
        border: "#232C3B",
        ink: "#E6EDF3",
        muted: "#7E8B9A",
        signal: "#4FD1C5",
        "signal-dim": "#245A55",
        warn: "#E0A340",
        danger: "#E0654F",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        code: "0.35em",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
