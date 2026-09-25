import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: process.env.SPECDOCK_SITE_OUT || resolve(".specdock/site"),
    emptyOutDir: false,
    rollupOptions: {
      input: resolve("packages/studio/client/main.jsx"),
      output: { entryFileNames: "studio.js", assetFileNames: "[name][extname]" },
    },
  },
});
