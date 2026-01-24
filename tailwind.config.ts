import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        30: "repeat(30, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
} satisfies Config;