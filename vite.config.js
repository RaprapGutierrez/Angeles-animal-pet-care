import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Only pull out the two chunks we KNOW are shared by every
          // route (React core + Supabase SDK). Everything else is left
          // alone (return undefined) so Rollup keeps its automatic
          // per-route splitting — a library only used by one lazy-loaded
          // page stays out of the initial load for every other page.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          // no return -> Rollup decides automatically per dynamic import
        },
      },
    },
  },
});
