import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // 🔥 Warn only above 600KB (avoids false alarms)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Core React ──────────────────────────────
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "react-vendor";
          }

          // ── Framer Motion (biggest single lib) ──────
          if (id.includes("node_modules/framer-motion")) {
            return "motion";
          }

          // ── Lucide Icons ────────────────────────────
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }

          // ── All Radix UI ────────────────────────────
          if (id.includes("node_modules/@radix-ui")) {
            return "ui-radix";
          }

          // ── Routing ─────────────────────────────────
          if (id.includes("node_modules/wouter")) {
            return "router";
          }

          // ── Data Fetching ───────────────────────────
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "query";
          }

          // ── Forms & Validation ──────────────────────
          if (
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/@hookform") ||
            id.includes("node_modules/zod")
          ) {
            return "forms";
          }

          // ── Charts ──────────────────────────────────
          if (id.includes("node_modules/recharts")) {
            return "charts";
          }

          // ── Date Utils ──────────────────────────────
          if (id.includes("node_modules/date-fns")) {
            return "date-utils";
          }

          // ── Animation helpers ───────────────────────
          if (
            id.includes("node_modules/clsx") ||
            id.includes("node_modules/class-variance-authority") ||
            id.includes("node_modules/tailwind-merge")
          ) {
            return "utils";
          }
        },
      },
    },
  },
});