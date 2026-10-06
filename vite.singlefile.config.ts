import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile";

/**
 * Standalone single-file HTML build — for publishing to Puppy Pages
 * or Prototype Hub as a self-contained bundle.
 *
 * Usage: `npm run build:html` → emits `dist-standalone/index.html`.
 */
export default defineConfig({
  plugins: [
    react({
      exclude: /src\/(components|patterns|common|hooks)\/.*/,
    }),
    viteSingleFile(),
  ],
  resolve: {
    alias: {
      "@livingdesign/react": path.resolve(__dirname, "src/index.ts"),
    },
  },
  build: {
    outDir: "dist-standalone",
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 100000,
  },
});
