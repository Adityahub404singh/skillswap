
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    // SkillSwap PWA Configuration
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,

      includeAssets: [
        "favicon.svg",
      ],

      manifest: {
        id: "/",
        name: "SkillSwap",
        short_name: "SkillSwap",

        description:
          "AI-powered peer-to-peer skill exchange platform",

        theme_color: "#7c3aed",
        background_color: "#ffffff",

        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp,woff2}",
        ],

        navigateFallback: "index.html",

        // Keep API requests outside frontend navigation fallback.
        navigateFallbackDenylist: [
          /^\/api\//,
        ],

        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],

  // Existing path aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  // Existing development server
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

  // Production build configuration
  build: {
    outDir: "dist",
    emptyOutDir: true,

    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "react-vendor";
          }

          // Framer Motion
          if (
            id.includes("node_modules/framer-motion")
          ) {
            return "motion";
          }

          // Lucide Icons
          if (
            id.includes("node_modules/lucide-react")
          ) {
            return "icons";
          }

          // Radix UI
          if (
            id.includes("node_modules/@radix-ui")
          ) {
            return "ui-radix";
          }

          // Routing
          if (
            id.includes("node_modules/wouter")
          ) {
            return "router";
          }

          // React Query
          if (
            id.includes("node_modules/@tanstack/react-query")
          ) {
            return "query";
          }

          // Forms and Validation
          if (
            id.includes("node_modules/react-hook-form") ||
            id.includes("node_modules/@hookform") ||
            id.includes("node_modules/zod")
          ) {
            return "forms";
          }

          // Charts
          if (
            id.includes("node_modules/recharts")
          ) {
            return "charts";
          }

          // Date Utils
          if (
            id.includes("node_modules/date-fns")
          ) {
            return "date-utils";
          }

          // Animation helpers
          if (
            id.includes("node_modules/clsx") ||
            id.includes(
              "node_modules/class-variance-authority"
            ) ||
            id.includes("node_modules/tailwind-merge")
          ) {
            return "utils";
          }
        },
      },
    },
  },
});
