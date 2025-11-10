// vite.config.js
console.log("✅ Loaded env:", process.env.VITE_API_URL);

import { defineConfig } from "vite";
import react from "vite-plugin-react-swc";
import tailwindcss from "tailwindcss";
import path from "path";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),

      // ✅ 아래 두 줄이 핵심! development entry를 production entry로 강제 연결
      "react-router/dist/development/index.mjs":
        "react-router/dist/index.js",
      "react-router/dist/development/dom-export.mjs":
        "react-router/dist/dom.js",
    },
  },
  server: {
    port: 3000,
  },
  build: {
    manifest: true,
    emptyOutDir: true,  // ensures old assets are deleted before each build
  },
});

