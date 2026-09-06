import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  plugins: [
    react(),
    // After `npm run build`, this opens dist/stats.html showing exactly
    // what's inside each chunk and how big it is. Remove once you're done
    // diagnosing, or leave it — it only runs at build time, not runtime.
    visualizer({
      filename: "dist/stats.html",
      gzipSize: true,
      brotliSize: true,
      open: false,
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  build: {
    // Helps verify whether a chunk is actually over a reasonable size
    // instead of silently ballooning
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React core — changes rarely, cache-friendly on its own
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }

          // Supabase SDK — separate chunk since it's sizeable and used
          // everywhere, but shouldn't block parsing of route-specific code
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          // Charting/visualization libs — only pull these in if a route
          // actually renders a chart (Predictive Analytics, Reports, etc.)
          if (
            id.includes("recharts") ||
            id.includes("chart.js") ||
            id.includes("d3") ||
            id.includes("three")
          ) {
            return "vendor-charts";
          }

          // Everything else third-party
          return "vendor-misc";
        },
      },
    },
  },
});
