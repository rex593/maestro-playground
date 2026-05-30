import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
// On a production build we serve from a GitHub Pages project path
// (https://rex593.github.io/maestro-playground/), so assets need that base.
// Dev stays at "/". Override with VITE_BASE if the repo/site path changes.
export default defineConfig(({ command }) => ({
  base:
    process.env.VITE_BASE ??
    (command === "build" ? "/maestro-playground/" : "/"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
}));
