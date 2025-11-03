import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Store Vite cache outside OneDrive to prevent EPERM lock errors
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  cacheDir: "C:/vite-cache", // <– move cache away from OneDrive
});
