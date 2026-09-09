import type { Config } from "tailwindcss";

/**
 * MONOLITH design tokens.
 * Discipline: pure black ground, stark white text, ONE accent (amber).
 * No radii, no shadows, no gradients. Separation is done with hairlines.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Rounded corners are removed from the design language entirely.
    borderRadius: { none: "0", DEFAULT: "0", sm: "0", md: "0", lg: "0", full: "0" },
    // Soft shadows are removed; depth is expressed with borders only.
    boxShadow: { none: "none", DEFAULT: "none" },
    extend: {
      colors: {
        void: "#0A0A0A",       // page ground
        pit: "#050505",        // recessed wells (inputs, table headers)
        slab: "#0E0E0E",       // raised panel fill
        bone: "#F5F5F5",       // primary text
        ash: "#8A8A8A",        // secondary text
        dust: "#5A5A5A",       // tertiary / disabled
        hair: "#242424",       // standard hairline
        weld: "#3A3A3A",       // emphasized hairline
        amber: {
          DEFAULT: "#FFB000",  // the one accent
          dim: "#A87400",
          wash: "#1A1200",     // amber at ~8% over void, precomputed (no gradients)
        },
      },
      fontFamily: {
        kufi: ["var(--font-kufi)", "Tahoma", "sans-serif"],
        plex: ["var(--font-plex)", "Tahoma", "sans-serif"],
        // Reserved for system/status text only. Never for Arabic prose.
        mono: ["var(--font-mono)", "ui-monospace", "Menlo", "monospace"],
      },
      fontSize: {
        micro: ["0.625rem", { lineHeight: "1rem", letterSpacing: "0.14em" }],
        tiny: ["0.6875rem", { lineHeight: "1.05rem", letterSpacing: "0.1em" }],
      },
      borderWidth: { DEFAULT: "1px", 2: "2px", 3: "3px" },
      transitionTimingFunction: {
        // Mechanical: fast out of the gate, hard stop. No overshoot, ever.
        mech: "cubic-bezier(0.2, 0, 0, 1)",
      },
      keyframes: {
        "slab-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "wipe-in": {
          from: { opacity: "0", transform: "translateX(6px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        blink: { "0%, 49%": { opacity: "1" }, "50%, 100%": { opacity: "0" } },
        scan: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(100%)" } },
        stamp: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "slab-in": "slab-in 180ms cubic-bezier(0.2,0,0,1) both",
        "wipe-in": "wipe-in 160ms cubic-bezier(0.2,0,0,1) both",
        blink: "blink 1.1s steps(1) infinite",
        scan: "scan 1.4s cubic-bezier(0.2,0,0,1) infinite",
        stamp: "stamp 120ms steps(2) both",
      },
    },
  },
  plugins: [],
};

export default config;
