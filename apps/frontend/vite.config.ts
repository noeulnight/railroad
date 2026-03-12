import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api/": {
        target: process.env.VITE_PROXY_API_TARGET ?? "http://korail-backend-service.korail.svc.cluster.local:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\//, ""),
      },
    },
  },
});
